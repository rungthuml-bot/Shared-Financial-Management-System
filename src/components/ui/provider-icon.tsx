import * as React from "react";
import {
  ShoppingBag,
  CreditCard,
  Smartphone,
  Layers,
  Store,
  Wallet,
} from "lucide-react";

export interface ProviderIconProps {
  slug?: string | null;
  className?: string;
}

export const PROVIDER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  shopee: ShoppingBag,
  lazada: ShoppingBag,
  tiktok: Store,
  "tiktok-shop": Store,
  "credit-card": CreditCard,
  truemoney: Wallet,
  wallet: Wallet,
  mobile: Smartphone,
};

/**
 * Shared ProviderIcon component.
 * Maps known provider slugs to brand-appropriate Lucide icons.
 */
export function ProviderIcon({ slug, className }: ProviderIconProps) {
  const IconComponent = (slug && PROVIDER_ICON_MAP[slug]) || Layers;
  return <IconComponent className={className} />;
}
