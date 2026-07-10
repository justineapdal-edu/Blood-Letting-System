import { ConnectorForm } from '@/components/forms/ConnectorForm'

export default function FormsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Form Integration Manager</h1>
      <p className="mt-2 mb-6 text-gray-600">
        Connect a new Google Form by creating a connection token and linking the webhook.
      </p>
      <ConnectorForm />
    </div>
  )
}
