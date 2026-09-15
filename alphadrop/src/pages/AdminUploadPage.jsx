import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const initialForm = {
  title: '',
  notes: '',
  targetTier: 'SUBSCRIPTION',
}

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function AdminUploadPage() {
  const [form, setForm] = useState(initialForm)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [downloadingFileId, setDownloadingFileId] = useState(null)
  const automaticDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await api.get('/admin/daily-content')
        setRecords(response.data?.data || [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load uploaded content')
      } finally {
        setLoadingRecords(false)
      }
    }

    loadRecords()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (files.length < 1) {
      toast.error('Please select at least one file to upload')
      return
    }

    setUploading(true)

    try {
      const payload = new FormData()
      payload.append('title', form.title)
      payload.append('notes', form.notes)
      payload.append('targetTier', form.targetTier)
      files.forEach((file) => payload.append('files', file))

      const response = await api.post('/admin/upload-daily', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Daily content uploaded successfully')
      const uploadedRecord = response.data?.data?.content
      if (uploadedRecord) {
        setRecords((current) => [uploadedRecord, ...current])
      }
      setForm(initialForm)
      setFiles([])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (fileIndex) => {
    setFiles((current) => current.filter((_, index) => index !== fileIndex))
  }

  const downloadFile = async (record, file) => {
    setDownloadingFileId(file._id)

    try {
      const response = await api.get(`/admin/daily-content/${record._id}/files/${file._id}/download`, {
        responseType: 'blob',
      })
      const objectUrl = URL.createObjectURL(new Blob([response.data], { type: file.fileMimeType }))
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.originalFileName || 'attachment'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to download file')
    } finally {
      setDownloadingFileId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-zinc-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1">
          <Header title="Upload Daily Data" badge="Content" subtitle="Publish premium files to the selected target audience." />

          <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-5">
            <div className="grid gap-4 xl:grid-cols-12">
              <label className="block text-sm text-slate-700 xl:col-span-3">
                Title
                <input name="title" value={form.title} onChange={handleChange} placeholder="Morning market brief" className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block text-sm text-slate-700 xl:col-span-3">
                Notes
                <input name="notes" value={form.notes} onChange={handleChange} placeholder="Short release note" className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100" />
              </label>

              <label className="block text-sm text-slate-700 xl:col-span-2">
                Target audience
                <select name="targetTier" value={form.targetTier} onChange={handleChange} className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100">
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="ONE_TIME">One-time</option>
                  <option value="ALL">All</option>
                </select>
              </label>

              <label className="block text-sm text-slate-700 xl:col-span-2">
                Published date
                <input value={automaticDate} readOnly aria-readonly="true" className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-blue-100 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none" />
              </label>

              <div className="xl:col-span-2">
                <label className="block text-sm text-slate-700">
                  Upload files
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files || []))}
                    className="mt-1.5 block w-full rounded-xl border border-dashed border-blue-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 file:mr-2 file:rounded-full file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-blue-700"
                  />
                </label>

              </div>
            </div>

            {files.length > 0 && (
              <ul className="mt-4 divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-slate-50">
                {files.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-slate-700">
                    <span className="min-w-0 truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(index)} className="shrink-0 text-xs font-medium text-red-600 transition hover:text-red-700">Remove</button>
                  </li>
                ))}
              </ul>
            )}

            <button type="submit" disabled={uploading} className="primary-button mt-6 w-full disabled:opacity-70">
              {uploading ? 'Uploading files...' : 'Publish daily content'}
            </button>
          </form>

          <section className="glass-panel mt-6 rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Uploaded daily data</h2>
                <p className="mt-1 text-sm text-slate-500">Preview of all published records.</p>
              </div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{records.length} records</span>
            </div>

            {loadingRecords ? (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 p-4 text-sm text-slate-500">Loading records...</div>
            ) : records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 p-4 text-sm text-slate-500">No daily data has been uploaded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-blue-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-medium">Title</th>
                      <th className="px-3 py-3 font-medium">Note</th>
                      <th className="px-3 py-3 font-medium">Audience</th>
                      <th className="px-3 py-3 font-medium">Files</th>
                      <th className="px-3 py-3 font-medium">Date</th>
                      <th className="px-3 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record._id} className="border-b border-blue-50 align-top last:border-b-0">
                        <td className="max-w-56 px-3 py-3 font-medium text-slate-900">{record.title}</td>
                        <td className="max-w-72 px-3 py-3 text-slate-600">{record.notes || '—'}</td>
                        <td className="px-3 py-3"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">{record.targetTier}</span></td>
                        <td className="max-w-64 px-3 py-3 text-slate-600">{(record.files || []).map((file) => file.originalFileName).filter(Boolean).join(', ') || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(record.publishedAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {(record.files || []).map((file) => (
                              <button
                                key={file._id}
                                type="button"
                                onClick={() => downloadFile(record, file)}
                                disabled={downloadingFileId === file._id}
                                title={`Download ${file.originalFileName || 'attachment'}`}
                                aria-label={`Download ${file.originalFileName || 'attachment'}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition duration-200 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                              >
                                <Download size={15} />
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
