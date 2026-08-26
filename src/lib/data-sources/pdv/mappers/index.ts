// -----------------------------------------------------------------------------
// Seleção de mapper por sistema de PDV/ERP. Cada sistema tem o seu mapper
// isolado; adicionar um ERP novo = criar um arquivo aqui e registrar abaixo.
// -----------------------------------------------------------------------------

import type { Order } from "../../types";
import type { PdvSystem } from "../config";
import { blingSaleSchema, mapBlingSale } from "./bling";

export interface MappedPdvOrder {
  order: Order;
  externalId: string;
  updatedAt: string;
}

export type PdvMapper = (raw: unknown) => MappedPdvOrder;

const MAPPERS: Partial<Record<PdvSystem, PdvMapper>> = {
  bling: (raw) => mapBlingSale(blingSaleSchema.parse(raw)),
  // tiny, omie, linx, totvs, shopify_pos, custom: implementar quando definido.
};

export function getPdvMapper(system: PdvSystem): PdvMapper {
  const mapper = MAPPERS[system];
  if (!mapper) {
    throw new Error(`Mapper do PDV "${system}" ainda não implementado.`);
  }
  return mapper;
}
