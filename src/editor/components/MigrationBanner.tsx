import { DownloadIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ProjectImportExportService } from '@/shared/services/ProjectImportExportService'
import { downloadFile } from '@/shared/utils/downloadFile'

export function MigrationBanner(): React.JSX.Element {
  const { t } = useTranslation('common')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsExporting(true)
    setExportError(null)
    try {
      const result = await ProjectImportExportService.exportToString()
      if (result.success) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
        downloadFile(result.content, `strawbuild-project-${timestamp}.json`)
      } else {
        setExportError(result.error)
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="absolute inset-0 bottom-9 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-lg rounded-xl border border-amber-500/50 bg-amber-50 p-6 shadow-2xl dark:bg-amber-950/90">
        <h2 className="mb-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{t($ => $.migration.title)}</h2>
        <p className="mb-1 text-lg font-medium text-amber-800 dark:text-amber-200">{t($ => $.migration.subtitle)}</p>
        <p className="mb-4 text-amber-700 dark:text-amber-300">{t($ => $.migration.message)}</p>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => {
              void handleDownload()
            }}
            disabled={isExporting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t($ => $.migration.downloadButton)}
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            <a href="https://strawbuild.app" rel="noopener noreferrer">
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              {t($ => $.migration.newSiteButton)}
            </a>
          </Button>
        </div>

        {exportError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{exportError}</p>}

        <p className="text-sm text-amber-600 dark:text-amber-400">{t($ => $.migration.importInstructions)}</p>
      </div>
    </div>
  )
}
