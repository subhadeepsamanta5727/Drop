import { useEffect, useState } from 'react'
import { Download, FolderUp, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/ui/Header.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import api from '../services/api.js'

const initialForm = {
  title: '',
  notes: '',
  link: '',
  category: '',
}

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function AdminUploadPage({ oneTimeOnly = false }) {
  const [form, setForm] = useState(initialForm)
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [uploading, setUploading] = useState(false)
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [downloadingFileId, setDownloadingFileId] = useState(null)
  const automaticDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  const loadData = async () => {
    try {
      const [recordsRes, categoriesRes] = await Promise.all([
        api.get('/admin/daily-content'),
        api.get('/categories', {
          params: { type: oneTimeOnly ? 'ONE_TIME_CATEGORY' : 'SUBSCRIPTION_DAILY' },
        }),
      ])
      setRecords(recordsRes.data?.data || [])
      const fetchedCategories = categoriesRes.data?.data || []
      setCategories(fetchedCategories)

      const activeCategories = fetchedCategories
        .map((item) => item.category?.toUpperCase())
        .filter(Boolean)

      if (activeCategories.length > 0 && !activeCategories.includes(form.category?.toUpperCase())) {
        setForm((curr) => ({ ...curr, category: activeCategories[0] }))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load upload configuration')
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.category) {
      toast.error('Please select a category for this upload.')
      return
    }

    if (files.length < 1) {
      toast.error('Please select at least one file to upload')
      return
    }

    setUploading(true)

    try {
      const payload = new FormData()
      payload.append('title', form.title)
      payload.append('notes', form.notes)
      payload.append('link', form.link)
      payload.append('category', form.category.toUpperCase().trim())
      payload.append('contentType', uploadContentType)

      const derivedTargetTier = uploadContentType === 'SUBSCRIPTION_DAILY'
        ? 'SUBSCRIPTION'
        : 'ONE_TIME'
      payload.append('targetTier', derivedTargetTier)

      files.forEach((file) => payload.append('files', file))

      const response = await api.post('/admin/upload-daily', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success(`${uploadContentType === 'ONE_TIME_CATEGORY' ? 'Lifetime category content' : 'Subscriber daily content'} uploaded to [${form.category}]!`)
      const uploadedRecord = response.data?.data?.content
      if (uploadedRecord) {
        setRecords((current) => [uploadedRecord, ...current])
      }
      setForm((curr) => ({ ...initialForm, category: curr.category }))
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

  const availableCategories = categories
    .filter((item) => item.category)
    .map((item) => ({
      value: item.category.toUpperCase(),
      label: item.title || item.category.toUpperCase(),
      note: item.note || '',
    }))
  const uploadContentType = oneTimeOnly ? 'ONE_TIME_CATEGORY' : 'SUBSCRIPTION_DAILY'
  const visibleRecords = records.filter((record) => {
    const recordType = record.contentType || (
      record.targetTier === 'ONE_TIME'
        ? 'ONE_TIME_CATEGORY'
        : record.targetTier === 'SUBSCRIPTION'
        ? 'SUBSCRIPTION_DAILY'
        : null
    )
    return recordType === uploadContentType
  })

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 text-zinc-900 lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row">
        <Sidebar mode="ADMIN" />

        <main className="min-w-0 flex-1">
          <Header
            title={oneTimeOnly ? 'Upload One-Time Category Data' : 'Upload Subscriber Daily Data'}
            badge="Content Delivery"
            subtitle={oneTimeOnly
              ? 'Publish lifetime files that remain available to users who purchase this category.'
              : 'Publish daily files for users with an active recurring subscription.'}
          />

          <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f6ce5]">
              <FolderUp size={16} />
              {oneTimeOnly ? 'Publish Lifetime Category Dataset' : 'Publish Subscriber Daily Dataset'}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
              <label className="block text-sm text-slate-700 xl:col-span-4">
                Dataset Title *
                <input
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Daily Momentum Screener"
                  className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm text-slate-700 xl:col-span-3">
                {oneTimeOnly ? 'Package Category *' : 'Subscriber Data Category *'}
                <select
                  name="category"
                  required
                  value={form.category}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 font-bold uppercase tracking-wide text-blue-800 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                >
                  {availableCategories.length === 0 ? (
                    <option value="">No active subscriber categories available</option>
                  ) : availableCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}{category.note ? ` — ${category.note}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700 xl:col-span-2">
                Release Date
                <input
                  value={automaticDate}
                  readOnly
                  aria-readonly="true"
                  className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-blue-100 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none"
                />
              </label>

              <label className="block text-sm text-slate-700 md:grid-cols-2 xl:col-span-8">
                Release Notes / Summary
                <input
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Key setups, market indicators, or file instructions"
                  className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm text-slate-700 md:col-span-2 xl:col-span-8">
                Reference Link <span className="text-xs text-slate-400">(optional)</span>
                <input
                  type="url"
                  name="link"
                  value={form.link}
                  onChange={handleChange}
                  placeholder="https://example.com/reference"
                  className="mt-1.5 w-full rounded-xl border border-blue-100 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition duration-200 focus:border-[#0f6ce5] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="xl:col-span-4">
                <label className="block text-sm text-slate-700">
                  Select Files *
                  <input
                    type="file"
                    multiple
                    required={files.length === 0}
                    onChange={(event) => setFiles(Array.from(event.target.files || []))}
                    className="mt-1.5 block w-full rounded-xl border border-dashed border-blue-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 file:mr-2 file:rounded-full file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-blue-700"
                  />
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <ul className="mt-4 divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-slate-50">
                {files.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-700">
                    <span className="min-w-0 truncate font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="primary-button mt-6 w-full disabled:opacity-70 text-sm font-bold tracking-wide"
            >
              {uploading ? 'Uploading and tagging dataset...' : `Publish to ${form.category || 'Selected Category'}`}
            </button>
          </form>

          <section className="glass-panel mt-6 rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {oneTimeOnly ? 'Uploaded One-Time Data' : 'Uploaded Subscriber Daily Data'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">History of all published files with their assigned categories and access rules.</p>
              </div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {visibleRecords.length} records
              </span>
            </div>

            {loadingRecords ? (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 p-6 text-sm text-slate-500">
                Loading records...
              </div>
            ) : visibleRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 p-6 text-sm text-slate-500">
                {oneTimeOnly ? 'No one-time category data has been uploaded yet.' : 'No subscriber daily data has been uploaded yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-blue-100">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-blue-100 bg-blue-50/50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Note</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Link</th>
                      <th className="px-4 py-3 font-semibold">Files</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {visibleRecords.map((record) => (
                      <tr key={record._id} className="transition hover:bg-blue-50/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{record.title}</p>
                          {record.link && (
                            <a href={record.link} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs font-semibold text-blue-600 hover:underline">
                              Open reference link
                            </a>
                          )}
                        </td>
                        <td className="max-w-56 px-4 py-3 text-xs text-slate-600">
                          {record.notes || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                            <Tag size={12} />
                            {record.category || 'GENERAL'}
                          </span>
                        </td>
                        <td className="max-w-48 px-4 py-3 text-xs">
                          {record.link ? (
                            <a
                              href={record.link}
                              target="_blank"
                              rel="noreferrer"
                              title={record.link}
                              className="block truncate font-semibold text-blue-600 hover:underline"
                            >
                              Open link
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {(record.files || []).map((file) => file.originalFileName).filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {formatDate(record.publishedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {(record.files || []).map((file) => (
                              <button
                                key={file._id}
                                type="button"
                                onClick={() => downloadFile(record, file)}
                                disabled={downloadingFileId === file._id}
                                title={`Download ${file.originalFileName || 'attachment'}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                              >
                                <Download size={14} />
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
