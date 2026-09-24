"use client";
import { toast as sonner } from "sonner";
import { currentLanguage, translate } from "@/lib/i18n";
type Message = Parameters<typeof sonner.success>[0];
const localize = (message: Message) => typeof message === "string" ? translate(message, currentLanguage()) : message;
export const toast = {
  ...sonner,
  success: (message: Message, options?: Parameters<typeof sonner.success>[1]) => sonner.success(localize(message), options),
  error: (message: Message, options?: Parameters<typeof sonner.error>[1]) => sonner.error(localize(message), options),
  info: (message: Message, options?: Parameters<typeof sonner.info>[1]) => sonner.info(localize(message), options),
  warning: (message: Message, options?: Parameters<typeof sonner.warning>[1]) => sonner.warning(localize(message), options),
};
