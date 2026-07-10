import { DynamicGrid } from '@/components/grid/DynamicGrid'

export default async function GridPage({
  params,
}: {
  params: Promise<{ formId: string }>
}) {
  const { formId } = await params

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Grid: {formId}</h1>
      <p className="mt-2 mb-6 text-gray-600">
        Excel-like editable data grid for this blood drive.
      </p>
      <DynamicGrid formId={formId} />
    </div>
  )
}
