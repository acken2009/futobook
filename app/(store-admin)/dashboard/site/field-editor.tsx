"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { FieldDef } from "@/lib/site/sections";

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Props {
  fields: FieldDef[];
  values: Record<string, any>;
  onChange: (key: string, value: unknown) => void;
}

/** sections.ts のフィールド定義からフォームを組み立てる */
export function FieldEditor({ fields, values, onChange }: Props) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <Field key={field.key} field={field} value={values[field.key]} onChange={(v) => onChange(field.key, v)} />
      ))}
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: unknown) => void }) {
  switch (field.kind) {
    case "text":
      return (
        <Label text={field.label} count={field.max ? `${(value ?? "").length}/${field.max}` : undefined}>
          <input
            type="text"
            value={value ?? ""}
            maxLength={field.max}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </Label>
      );
    case "textarea":
      return (
        <Label text={field.label} count={field.max ? `${(value ?? "").length}/${field.max}` : undefined}>
          <textarea
            value={value ?? ""}
            maxLength={field.max}
            placeholder={field.placeholder}
            rows={4}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </Label>
      );
    case "select":
      return (
        <Label text={field.label}>
          <select value={value ?? field.options[0].value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Label>
      );
    case "toggle":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
          {field.label}
        </label>
      );
    case "image":
      return (
        <Label text={field.label}>
          <ImageField value={value ?? ""} onChange={onChange} />
        </Label>
      );
    case "list":
      return <ListField field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />;
  }
}

function Label({ text, count, children }: { text: string; count?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="block text-sm font-medium text-gray-700">{text}</span>
        {count && <span className="text-xs text-gray-400">{count}</span>}
      </div>
      {children}
    </div>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "section");
    try {
      const res = await fetch("/api/store-images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "アップロードに失敗しました");
      else onChange(data.url);
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="relative w-20 h-20 shrink-0 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden hover:border-blue-400 transition-colors flex items-center justify-center text-gray-400"
        >
          {value ? <Image src={value} alt="" fill className="object-cover" unoptimized /> : <span className="text-2xl">＋</span>}
        </button>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "アップロード中..." : value ? "画像を変更" : "画像を選択"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="block text-xs text-red-500 hover:underline">
              画像を外す
            </button>
          )}
          <p className="text-xs text-gray-400">PNG・JPG・WebP、5MB以下</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
    </div>
  );
}

function ListField({ field, value, onChange }: { field: Extract<FieldDef, { kind: "list" }>; value: any[]; onChange: (v: unknown) => void }) {
  function emptyItem() {
    return Object.fromEntries(
      field.itemFields.map((f) => [f.key, f.kind === "toggle" ? false : f.kind === "list" ? [] : ""])
    );
  }
  function updateItem(index: number, key: string, v: unknown) {
    onChange(value.map((item, i) => (i === index ? { ...item, [key]: v } : item)));
  }
  function move(index: number, dir: -1 | 1) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-2">{field.label}</span>
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">{field.itemLabel} {i + 1}</span>
              <div className="flex gap-1 text-xs">
                <IconButton label="上へ" onClick={() => move(i, -1)} disabled={i === 0}>↑</IconButton>
                <IconButton label="下へ" onClick={() => move(i, 1)} disabled={i === value.length - 1}>↓</IconButton>
                <IconButton label="削除" onClick={() => onChange(value.filter((_, j) => j !== i))} danger>✕</IconButton>
              </div>
            </div>
            <FieldEditor fields={field.itemFields} values={item} onChange={(k, v) => updateItem(i, k, v)} />
          </div>
        ))}
      </div>
      {value.length < field.maxItems ? (
        <button
          type="button"
          onClick={() => onChange([...value, emptyItem()])}
          className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          ＋ {field.itemLabel}を追加
        </button>
      ) : (
        <p className="mt-2 text-xs text-gray-400">最大{field.maxItems}件までです</p>
      )}
    </div>
  );
}

export function IconButton({
  label, onClick, disabled, danger, children,
}: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center disabled:opacity-30 ${
        danger ? "text-red-500 hover:bg-red-50" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
