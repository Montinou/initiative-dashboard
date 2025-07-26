import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 })
    }

    const formData = await request.formData()
    const file: File | null = formData.get('image') as unknown as File
    const imageType: string = formData.get('type') as string || 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Get user profile for tenant info
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${imageType}_${userProfile.tenant_id}_${user.id}_${timestamp}.${fileExtension}`
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file to public/uploads directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'profiles')
    const filePath = join(uploadDir, fileName)
    
    // Ensure upload directory exists
    await writeFile(filePath, buffer).catch(async (error) => {
      if (error.code === 'ENOENT') {
        // Create directory if it doesn't exist
        const { mkdir } = await import('fs/promises')
        await mkdir(uploadDir, { recursive: true })
        await writeFile(filePath, buffer)
      } else {
        throw error
      }
    })

    // Return the public URL
    const imageUrl = `/uploads/profiles/${fileName}`

    return NextResponse.json({ 
      message: 'Image uploaded successfully',
      imageUrl 
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}