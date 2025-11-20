import { buildApiUrl } from './config';
import { ApiError, buildOptions, handleResponse } from './http';

export type AssetType =
  | 'PROMPT_TEMPLATE'
  | 'WORKFLOW'
  | 'DATASET'
  | 'EVALUATION'
  | 'GUARDRAIL';

export interface Asset {
  id: number;
  type: AssetType;
  name: string;
  description?: string | null;
  content?: unknown;
  tags: string[];
  archived: boolean;
  isTemplate: boolean;
  clientId?: number | null;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetFilters {
  clientId?: number;
  assetType?: AssetType;
  isTemplate?: boolean;
  search?: string;
  includeArchived?: boolean;
}

export interface AssetPayload {
  name: string;
  type: AssetType;
  clientId?: number | null;
  description?: string;
  content?: unknown;
  tags?: string[];
  isTemplate?: boolean;
}

export interface ProjectAssetLink {
  id: number;
  projectId: number;
  assetId: number;
  notes?: string | null;
  createdAt: string;
  asset: Asset;
}

const ASSETS_BASE_PATH = buildApiUrl('/assets');

export async function fetchAssets(filters?: AssetFilters): Promise<Asset[]> {
  const params = new URLSearchParams();

  if (filters?.clientId) {
    params.append('clientId', String(filters.clientId));
  }

  if (filters?.assetType) {
    params.append('assetType', filters.assetType);
  }

  if (filters?.isTemplate !== undefined) {
    params.append('isTemplate', String(filters.isTemplate));
  }

  if (filters?.search) {
    params.append('search', filters.search);
  }

  if (filters?.includeArchived) {
    params.append('archived', 'true');
  }

  const query = params.toString();
  const url = query ? `${ASSETS_BASE_PATH}?${query}` : ASSETS_BASE_PATH;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ assets: Asset[] }>(response);
  return data.assets;
}

export async function fetchAssetById(assetId: number): Promise<Asset> {
  const response = await fetch(
    `${ASSETS_BASE_PATH}/${assetId}`,
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ asset: Asset }>(response);
  return data.asset;
}

export async function createAsset(payload: AssetPayload): Promise<Asset> {
  const response = await fetch(
    ASSETS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ asset: Asset }>(response);
  return data.asset;
}

export async function updateAsset(
  assetId: number,
  payload: Partial<AssetPayload>,
): Promise<Asset> {
  const response = await fetch(
    `${ASSETS_BASE_PATH}/${assetId}`,
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ asset: Asset }>(response);
  return data.asset;
}

export async function archiveAsset(assetId: number): Promise<void> {
  const response = await fetch(
    `${ASSETS_BASE_PATH}/${assetId}`,
    buildOptions({ method: 'DELETE' }),
  );

  await handleResponse<void>(response);
}

export async function fetchProjectAssets(
  projectId: number,
  includeArchived?: boolean,
): Promise<ProjectAssetLink[]> {
  const params = new URLSearchParams();

  if (includeArchived) {
    params.set('archived', 'true');
  }

  const query = params.toString();
  const url = query
    ? `${buildApiUrl(`/projects/${projectId}/assets`)}?${query}`
    : buildApiUrl(`/projects/${projectId}/assets`);

  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ assets: ProjectAssetLink[] }>(response);
  return data.assets;
}

export async function linkAssetToProject(
  projectId: number,
  assetId: number,
  payload: { notes?: string },
): Promise<ProjectAssetLink> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/assets/${assetId}/link`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  );

  const data = await handleResponse<{ link: ProjectAssetLink }>(response);
  return data.link;
}

export async function unlinkAssetFromProject(
  projectId: number,
  assetId: number,
): Promise<void> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/assets/${assetId}/unlink`),
    buildOptions({ method: 'DELETE' }),
  );

  await handleResponse<void>(response);
}

export async function fetchAssetOrThrow(assetId: number): Promise<Asset> {
  try {
    return await fetchAssetById(assetId);
  } catch (error) {
    if ((error as ApiError).status === 404) {
      const notFound = new Error('Asset not found') as ApiError;
      notFound.status = 404;
      throw notFound;
    }

    throw error;
  }
}
