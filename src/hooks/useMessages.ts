import { useMemo } from 'react';
import { defaultMessages, mergeMessages } from '../i18n';
import type { Messages } from '../i18n';
import type { DeepPartial } from '../types';

export function useMessages(override?: DeepPartial<Messages>): Messages {
  return useMemo(() => mergeMessages(defaultMessages, override), [override]);
}
