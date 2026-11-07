import { channelLabels, dealStageLabels, leadStatusLabels, priorityLabels } from "@/lib/types";
import type { Channel, DealStage, LeadStatus, Priority } from "@/lib/types";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge badge-status-${status.toLowerCase()}`}>{leadStatusLabels[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority priority-${priority.toLowerCase()}`}><span className="priority-dot" />{priorityLabels[priority]}</span>;
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return <span className="channel-badge">{channelLabels[channel]}</span>;
}

export function StageBadge({ stage }: { stage: DealStage }) {
  return <span className={`badge badge-stage-${stage.toLowerCase()}`}>{dealStageLabels[stage]}</span>;
}
