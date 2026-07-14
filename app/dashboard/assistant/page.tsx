import { PageHeader } from "@/components/dashboard/page-header";
import { AssistantClient } from "@/components/assistant/assistant-client";

export default function AssistantPage() {
  return (
    <div>
      <PageHeader
        title="Payroll assistant"
        description="Ask questions in plain language — every answer is computed live from your payroll data and Fiber node."
      />
      <AssistantClient />
    </div>
  );
}
