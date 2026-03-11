import { RunDetail } from "../../../../../components/run-detail";

export default function ProjectRunDetailRoute({ params }: { params: { runId: string } }) {
  return <RunDetail runId={params.runId} />;
}
