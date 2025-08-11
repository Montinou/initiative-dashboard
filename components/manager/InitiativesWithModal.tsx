'use client'

import { useState, useEffect } from 'react'
import { InitiativesList } from './InitiativesList'
import { InitiativeFormModal, ActivityFormModal } from '@/components/modals'
import { useInitiatives } from '@/hooks/useInitiatives'
import { useAuth } from '@/lib/auth-context'

export function InitiativesWithModal() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<any | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null)
  const [locale, setLocale] = useState('es')
  
  const { profile } = useAuth()
  const { createInitiative, updateInitiative } = useInitiatives()

  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])

  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const handleEditClick = async (initiativeId: string) => {
    // Fetch the initiative data
    const response = await fetch(`/api/initiatives/${initiativeId}`)
    if (response.ok) {
      const initiative = await response.json()
      setEditingInitiative(initiative)
    }
  }

  const handleSaveInitiative = async (data: any, objectiveIds?: string[], activities?: any[]) => {
    try {
      if (editingInitiative) {
        await updateInitiative(editingInitiative.id, data)
      } else {
        // Create initiative with objectives and activities
        const response = await fetch('/api/initiatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...data,
            objective_ids: objectiveIds,
            activities
          })
        })
        
        if (!response.ok) throw new Error('Failed to create initiative')
      }
      
      setShowCreateModal(false)
      setEditingInitiative(null)
      
      // Refresh the initiatives list
      window.location.reload()
    } catch (error) {
      console.error('Error saving initiative:', error)
      throw error
    }
  }

  const handleSaveActivity = async (data: any) => {
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) throw new Error('Failed to create activity')
      
      setShowActivityModal(false)
      setSelectedInitiativeId(null)
      
      // Refresh the initiatives list
      window.location.reload()
    } catch (error) {
      console.error('Error saving activity:', error)
      throw error
    }
  }

  const handleAddActivityToInitiative = (initiativeId: string) => {
    setSelectedInitiativeId(initiativeId)
    setShowActivityModal(true)
  }

  return (
    <>
      <InitiativesList 
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
      />
      
      <InitiativeFormModal
        isOpen={showCreateModal || editingInitiative !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingInitiative(null)
        }}
        onSave={handleSaveInitiative}
        initiative={editingInitiative}
        locale={locale}
        defaultAreaId={profile?.area_id}
      />
      
      <ActivityFormModal
        isOpen={showActivityModal}
        onClose={() => {
          setShowActivityModal(false)
          setSelectedInitiativeId(null)
        }}
        onSave={handleSaveActivity}
        initiativeId={selectedInitiativeId}
        locale={locale}
      />
    </>
  )
}