// src/models/asset.ts

// 🗄️ DB-modellen (row types)

export interface AssetRow {
    id: number;
    type: string;
    ticker: string | null;
    name: string;
    quote_ccy: string;
    mic: string | null;
    unique_symbol: string;
}

export interface ListingRow {
    id: number;
    asset_id: number;
    mic: string | null;
    // Voeg hier extra velden toe zodra je public.listings verder wilt modelleren
    [key: string]: unknown;
}

export interface AssetWithListingsRow extends AssetRow {
    listings: ListingRow[];
}

// 📥 Request DTO's

export interface AssetPostBodyDto {
    type?: string;
    ticker?: string;
    name?: string;
    quote_ccy?: string;
    mic?: string;
    unique_symbol?: string;
}

// 📤 API / domein DTO's

export interface AssetListItemDto {
    id: number | string;
    unique_symbol: string;
}

export interface AssetListResponseDto {
    data?: AssetListItemDto[];
    message?: string;
}

export type AssetDetailDto = AssetWithListingsRow;

export interface AssetDetailResponseDto {
    data?: AssetDetailDto;
    message?: string;
}
