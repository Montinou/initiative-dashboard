-- Limpiar datos de iniciativas existentes, manteniendo áreas y usuarios
-- Solo eliminar iniciativas, subtasks, actividades, historial de progreso y uploads

-- 1. Eliminar actividades relacionadas con iniciativas
DELETE FROM public.activities WHERE initiative_id IS NOT NULL;

-- 2. Eliminar subtasks
DELETE FROM public.subtasks;

-- 3. Eliminar historial de progreso
DELETE FROM public.progress_history;

-- 4. Eliminar iniciativas
DELETE FROM public.initiatives;

-- 5. Eliminar registros de carga de archivos (intentar ambas tablas)
DELETE FROM public.file_uploads WHERE file_type LIKE '%spreadsheet%' OR file_name LIKE '%.xlsx';
DELETE FROM public.uploaded_files WHERE file_type = 'spreadsheet' OR original_filename LIKE '%.xlsx';

-- Verificar que las tablas estén vacías
SELECT 'initiatives' as table_name, COUNT(*) as count FROM public.initiatives
UNION ALL
SELECT 'subtasks' as table_name, COUNT(*) as count FROM public.subtasks
UNION ALL
SELECT 'activities' as table_name, COUNT(*) as count FROM public.activities
UNION ALL
SELECT 'progress_history' as table_name, COUNT(*) as count FROM public.progress_history;