'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  FileImage,
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Brain,
  TrendingUp,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStratixWebSocket } from '@/hooks/useStratixWebSocket'
import { stratixDataService } from '@/lib/stratix/data-service'
import type { StratixKPI, StratixInsight, StratixActionPlan } from '@/lib/stratix/api-client'

interface FileUploadAnalyzerProps {
  onAnalysisComplete?: (results: AnalysisResults) => void
  className?: string
}

interface AnalysisResults {
  fileName: string
  fileType: string
  extractedData: any
  insights: StratixInsight[]
  kpis: StratixKPI[]
  actionPlans: StratixActionPlan[]
}

interface UploadedFile {
  file: File
  content: string
  type: 'document' | 'spreadsheet' | 'presentation' | 'pdf'
  status: 'uploaded' | 'analyzing' | 'completed' | 'error'
  progress: number
  sessionId: string
  results?: AnalysisResults
  error?: string
}

export function FileUploadAnalyzer({ onAnalysisComplete, className }: FileUploadAnalyzerProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(new Map())
  const [activeTab, setActiveTab] = useState('upload')
  const [isDragOver, setIsDragOver] = useState(false)

  const {
    startProcessingSession,
    updateProcessingStatus,
    onProcessingUpdate,
    onProcessingComplete,
    onProcessingError,
    isConnected: wsConnected
  } = useStratixWebSocket()

  // Get file type from file extension
  const getFileType = useCallback((fileName: string): 'document' | 'spreadsheet' | 'presentation' | 'pdf' => {
    const extension = fileName.toLowerCase().split('.').pop()
    
    switch (extension) {
      case 'xlsx':
      case 'xls':
      case 'csv':
        return 'spreadsheet'
      case 'pptx':
      case 'ppt':
        return 'presentation'
      case 'pdf':
        return 'pdf'
      default:
        return 'document'
    }
  }, [])

  // Get file icon based on type
  const getFileIcon = useCallback((type: string) => {
    switch (type) {
      case 'spreadsheet':
        return <FileSpreadsheet className="h-5 w-5" />
      case 'presentation':
        return <Presentation className="h-5 w-5" />
      case 'pdf':
        return <FileImage className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }, [])

  // Read file content
  const readFileContent = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    console.log('📁 Processing uploaded files:', files.length)
    
    for (const file of Array.from(files)) {
      try {
        // Read file content
        const content = await readFileContent(file)
        const fileType = getFileType(file.name)
        const sessionId = startProcessingSession(file.name, fileType)
        
        const uploadedFile: UploadedFile = {
          file,
          content,
          type: fileType,
          status: 'uploaded',
          progress: 0,
          sessionId
        }
        
        setUploadedFiles(prev => new Map(prev).set(file.name, uploadedFile))
        
        console.log('✅ File uploaded and ready for analysis:', file.name)
        
        // Automatically start analysis
        await analyzeFile(file.name)
        
      } catch (error) {
        console.error('❌ Error processing file:', file.name, error)
        
        const errorFile: UploadedFile = {
          file,
          content: '',
          type: getFileType(file.name),
          status: 'error',
          progress: 0,
          sessionId: '',
          error: error instanceof Error ? error.message : 'Failed to process file'
        }
        
        setUploadedFiles(prev => new Map(prev).set(file.name, errorFile))
      }
    }
  }, [readFileContent, getFileType, startProcessingSession])

  // Analyze a specific file
  const analyzeFile = useCallback(async (fileName: string) => {
    const uploadedFile = uploadedFiles.get(fileName)
    if (!uploadedFile) return

    console.warn('AI migrated to Dialogflow. File analysis is disabled in this component.')
    setUploadedFiles(prev => {
      const newMap = new Map(prev)
      const file = newMap.get(fileName)
      if (file) {
        newMap.set(fileName, { ...file, status: 'error', error: 'Análisis con IA migrado a Dialogflow. Usa el asistente en /test-ai.' })
      }
      return newMap
    })
  }, [uploadedFiles])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    // Reset input
    e.target.value = ''
  }, [handleFileUpload])

  const filesArray = Array.from(uploadedFiles.values())

  return (
    <Card className={cn("bg-slate-800/50 backdrop-blur-xl border-white/10", className)}>
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Analizador de Documentos IA
          </div>
          {wsConnected && (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
              Conectado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
            <TabsTrigger value="upload" className="text-white">
              <Upload className="h-4 w-4 mr-2" />
              Subir
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-white">
              <Brain className="h-4 w-4 mr-2" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="results" className="text-white">
              <Eye className="h-4 w-4 mr-2" />
              Resultados
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            {/* File Upload Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragOver 
                  ? "border-primary bg-primary/10" 
                  : "border-white/20 hover:border-white/40"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <p className="text-white/80 mb-2">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-white/60 text-sm mb-4">
                Soporta documentos, hojas de cálculo, presentaciones y PDFs
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
              />
              <Button 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-primary hover:bg-primary/90"
              >
                Seleccionar Archivos
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {filesArray.map((file) => (
                  <Card key={file.file.name} className="bg-slate-700/50 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.type)}
                          <div>
                            <p className="text-white font-medium">{file.file.name}</p>
                            <p className="text-white/60 text-sm">
                              {file.type} • {(file.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={cn(
                            file.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            file.status === 'analyzing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            file.status === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          )}
                        >
                          {file.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {file.status === 'analyzing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {file.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {file.status === 'uploaded' && <Upload className="h-3 w-3 mr-1" />}
                          {file.status}
                        </Badge>
                      </div>
                      
                      {file.status === 'analyzing' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Progreso</span>
                            <span className="text-white/60">{file.progress}%</span>
                          </div>
                          <Progress value={file.progress} className="h-2" />
                        </div>
                      )}
                      
                      {file.error && (
                        <p className="text-red-400 text-sm mt-2">{file.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {filesArray.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/60">No hay archivos para analizar</p>
                    <p className="text-white/40 text-sm">Sube archivos en la pestaña anterior</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {filesArray
                  .filter(file => file.status === 'completed' && file.results)
                  .map((file) => (
                    <Card key={file.file.name} className="bg-slate-700/50 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center">
                          {getFileIcon(file.type)}
                          <span className="ml-2">{file.file.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* KPIs */}
                        {file.results?.kpis && file.results.kpis.length > 0 && (
                          <div>
                            <h4 className="text-white/80 font-medium mb-2 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              KPIs Identificados ({file.results.kpis.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {file.results.kpis.slice(0, 4).map((kpi, index) => (
                                <div key={index} className="bg-slate-600/50 rounded p-2">
                                  <p className="text-white/90 text-sm font-medium">{kpi.name}</p>
                                  <p className="text-primary text-lg font-bold">{kpi.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Insights */}
                        {file.results?.insights && file.results.insights.length > 0 && (
                          <div>
                            <h4 className="text-white/80 font-medium mb-2 flex items-center">
                              <Brain className="h-4 w-4 mr-2" />
                              Insights Generados ({file.results.insights.length})
                            </h4>
                            <div className="space-y-2">
                              {file.results.insights.slice(0, 3).map((insight, index) => (
                                <div key={index} className="bg-slate-600/50 rounded p-3">
                                  <p className="text-white/90 font-medium">{insight.title}</p>
                                  <p className="text-white/70 text-sm">{insight.description}</p>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "mt-2",
                                      insight.impact === 'high' ? 'border-red-500/30 text-red-400' :
                                      insight.impact === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
                                      'border-green-500/30 text-green-400'
                                    )}
                                  >
                                    {insight.impact} impact
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Plans */}
                        {file.results?.actionPlans && file.results.actionPlans.length > 0 && (
                          <div>
                            <h4 className="text-white/80 font-medium mb-2 flex items-center">
                              <Target className="h-4 w-4 mr-2" />
                              Planes de Acción ({file.results.actionPlans.length})
                            </h4>
                            <div className="space-y-2">
                              {file.results.actionPlans.slice(0, 2).map((plan, index) => (
                                <div key={index} className="bg-slate-600/50 rounded p-3">
                                  <p className="text-white/90 font-medium">{plan.title}</p>
                                  <p className="text-white/70 text-sm">{plan.description}</p>
                                  <div className="flex items-center mt-2 space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      {plan.steps?.length || 0} pasos
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {plan.timeline}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                
                {filesArray.filter(file => file.status === 'completed').length === 0 && (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/60">No hay resultados disponibles</p>
                    <p className="text-white/40 text-sm">Los resultados aparecerán aquí cuando se complete el análisis</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}