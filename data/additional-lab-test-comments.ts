import labTestCommentTemplates from "../example";

export const additionalLabTestComments: Record<string, string> = Object.fromEntries(
  labTestCommentTemplates.flatMap((group) =>
    group.items
      .filter((item) => item.comment?.trim())
      .map((item) => [item.id, item.comment.trim()]),
  ),
);
