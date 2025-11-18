import { DocumentType, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import {
  DocumentCreateInput,
  DocumentGenerateInput,
} from '../validation/document.schema';

export interface ListDocumentsParams {
  ownerId: number;
  clientId?: number;
  projectId?: number;
}

export const listDocuments = async ({
  ownerId,
  clientId,
  projectId,
}: ListDocumentsParams) => {
  const where: Prisma.DocumentWhereInput = {
    ownerId,
    clientId,
    projectId,
  };

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const createDocument = async (
  ownerId: number,
  data: DocumentCreateInput,
) =>
  prisma.document.create({
    data: {
      ...data,
      ownerId,
      type: data.type ?? DocumentType.OTHER,
    },
  });

export const generateDocument = async (
  ownerId: number,
  data: DocumentGenerateInput,
) => {
  const url =
    data.url ??
    `/generated-documents/${Date.now()}-${encodeURIComponent(data.filename)}`;

  return prisma.document.create({
    data: {
      clientId: data.clientId,
      projectId: data.projectId,
      ownerId,
      type: data.type ?? DocumentType.OTHER,
      filename: data.filename,
      url,
    },
  });
};
