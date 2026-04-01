export type ToolId = 'none' | 'hoe' | 'wateringCan' | 'fishingRod';

export const TOOL_ORDER: readonly ToolId[] = [
  'none',
  'hoe',
  'wateringCan',
  'fishingRod',
];

export const TOOL_LABELS: Record<ToolId, string> = {
  none: 'Không có',
  hoe: 'Cuốc',
  wateringCan: 'Bình tưới',
  fishingRod: 'Cần câu',
};