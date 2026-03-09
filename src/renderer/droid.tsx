import React from 'react';

const STROKE = '#c7d2ff';

const BoxBot = ({ color }: { color: string }) => (
  <svg width="46" height="46" viewBox="0 0 46 46">
    <rect x="6" y="6" width="34" height="34" rx="4" fill={color} stroke={STROKE} strokeWidth="3" />
    <rect x="12" y="14" width="8" height="8" fill="#0b0f1a" />
    <rect x="26" y="14" width="8" height="8" fill="#0b0f1a" />
    <rect x="18" y="26" width="10" height="6" fill="#0b0f1a" />
  </svg>
);

const RoundBot = ({ color }: { color: string }) => (
  <svg width="46" height="46" viewBox="0 0 46 46">
    <circle cx="23" cy="23" r="16" fill={color} stroke={STROKE} strokeWidth="3" />
    <rect x="12" y="18" width="8" height="8" rx="2" fill="#0b0f1a" />
    <rect x="26" y="18" width="8" height="8" rx="2" fill="#0b0f1a" />
    <rect x="17" y="28" width="12" height="6" rx="2" fill="#0b0f1a" />
    <rect x="20" y="6" width="6" height="6" fill="#0b0f1a" />
  </svg>
);

const HexBot = ({ color }: { color: string }) => (
  <svg width="46" height="46" viewBox="0 0 46 46">
    <polygon points="23,4 38,13 38,33 23,42 8,33 8,13" fill={color} stroke={STROKE} strokeWidth="3" />
    <rect x="13" y="17" width="8" height="8" fill="#0b0f1a" />
    <rect x="25" y="17" width="8" height="8" fill="#0b0f1a" />
    <rect x="18" y="28" width="10" height="6" fill="#0b0f1a" />
  </svg>
);

const WingBot = ({ color }: { color: string }) => (
  <svg width="46" height="46" viewBox="0 0 46 46">
    <rect x="12" y="10" width="22" height="26" rx="5" fill={color} stroke={STROKE} strokeWidth="3" />
    <rect x="4" y="16" width="8" height="14" rx="3" fill="#18223b" stroke={STROKE} strokeWidth="2" />
    <rect x="34" y="16" width="8" height="14" rx="3" fill="#18223b" stroke={STROKE} strokeWidth="2" />
    <rect x="16" y="18" width="6" height="6" fill="#0b0f1a" />
    <rect x="24" y="18" width="6" height="6" fill="#0b0f1a" />
    <rect x="19" y="27" width="10" height="5" fill="#0b0f1a" />
  </svg>
);

const SparkBot = ({ color }: { color: string }) => (
  <svg width="46" height="46" viewBox="0 0 46 46">
    <rect x="9" y="9" width="28" height="28" rx="8" fill={color} stroke={STROKE} strokeWidth="3" />
    <path d="M23 5 L26 12 L33 15 L26 18 L23 25 L20 18 L13 15 L20 12 Z" fill="#0b0f1a" />
    <rect x="14" y="20" width="6" height="6" fill="#0b0f1a" />
    <rect x="26" y="20" width="6" height="6" fill="#0b0f1a" />
    <rect x="18" y="29" width="10" height="5" fill="#0b0f1a" />
  </svg>
);

const VARIANTS = [BoxBot, RoundBot, HexBot, WingBot, SparkBot];

const hashId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const AgentAvatar = ({ id, color }: { id: string; color: string }) => {
  const Comp = VARIANTS[hashId(id) % VARIANTS.length];
  return <Comp color={color} />;
};
