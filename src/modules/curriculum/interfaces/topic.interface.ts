export interface TopicSnapshot {
  readonly id: string;
  readonly curriculumVersionId: string;
  readonly code: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTopicInput {
  readonly code?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly sortOrder?: number;
}

export interface UpdateTopicInput {
  readonly code?: string | null;
  readonly title?: string;
  readonly description?: string | null;
}

export interface ReorderTopicsInput {
  readonly topicIds: string[];
}
