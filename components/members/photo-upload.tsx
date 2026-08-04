"use client";
import { useActionState, useRef } from "react";
import { Camera, LoaderCircle, UserRound } from "lucide-react";
import Image from "next/image";
import { uploadMemberPhotoAction } from "@/app/(dashboard)/members/actions";
import { Button } from "@/components/ui/button";

export function PhotoUpload({
  memberId,
  currentPhotoUrl,
  memberName,
}: {
  memberId: string;
  currentPhotoUrl: string | null;
  memberName: string;
}) {
  const [state, action, pending] = useActionState(uploadMemberPhotoAction, {});
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = state.url ?? currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div className="relative">
        <div className="grid size-24 place-items-center overflow-hidden rounded-full bg-primary/10 ring-4 ring-background">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={memberName}
              width={96}
              height={96}
              className="size-full object-cover"
            />
          ) : (
            <UserRound className="size-10 text-primary/60" />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-primary text-white shadow-md ring-2 ring-background hover:bg-[#e9281e] transition-colors"
          aria-label="Change photo"
        >
          <Camera className="size-3.5" />
        </button>
      </div>

      {/* Hidden form that auto-submits on file pick */}
      <form action={action}>
        <input type="hidden" name="id" value={memberId} />
        <input
          ref={inputRef}
          type="file"
          name="photo"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              e.target.form?.requestSubmit();
            }
          }}
        />
        {pending && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" />
            Uploading…
          </span>
        )}
      </form>

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.url && !pending && (
        <p className="text-xs text-emerald-600">Photo updated.</p>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        JPG, PNG or WebP · max 5 MB
      </p>
    </div>
  );
}
