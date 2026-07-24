"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, LockKeyhole } from "lucide-react";

type GalleryPinOverlayProps = {
  action: string;
  eventId: string;
  returnPath: string;
  galleryName: string;
  clientName: string;
  meta: string;
  viewerEmail: string;
  signOutHref: string;
  backgroundSrc?: string | null;
  desktopPosition: string;
  mobilePosition: string;
  hasError: boolean;
};

export function GalleryPinOverlay(props: GalleryPinOverlayProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [invalid, setInvalid] = useState(props.hasError);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const form = useRef<HTMLFormElement | null>(null);
  const pin = digits.join("");

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (pin.length !== 4 || submitting) return;
    const timer = window.setTimeout(() => {
      setSubmitting(true);
      form.current?.requestSubmit();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [pin, submitting]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setInvalid(false);
    if (digit && index < 3) inputs.current[index + 1]?.focus();
  }

  function handleKey(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 3) inputs.current[index + 1]?.focus();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    const next = Array.from({ length: 4 }, (_, index) => pasted[index] || "");
    setDigits(next);
    setInvalid(false);
    inputs.current[Math.min(pasted.length, 4) - 1]?.focus();
  }

  return (
    <main
      className={`gallery-pin ${invalid ? "is-invalid" : ""}`}
      style={{
        "--pin-desktop-position": props.desktopPosition,
        "--pin-mobile-position": props.mobilePosition
      } as React.CSSProperties}
    >
      {props.backgroundSrc ? (
        <Image
          src={props.backgroundSrc}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="gallery-pin__background"
        />
      ) : (
        <div className="gallery-pin__background gallery-pin__background--empty" />
      )}
      <div className="gallery-pin__veil" />
      <div className="gallery-pin__grain" />

      <section className="gallery-pin__content">
        <div className="gallery-pin__mark"><LockKeyhole size={19} /></div>
        <p className="gallery-pin__eyebrow">Private archive</p>
        <h1>{props.galleryName}</h1>
        <p className="gallery-pin__client">{props.clientName}</p>
        <p className="gallery-pin__meta">{props.meta}</p>

        <form ref={form} action={props.action} method="post" className="gallery-pin__form">
          <input type="hidden" name="eventId" value={props.eventId} />
          <input type="hidden" name="returnPath" value={props.returnPath} />
          <input type="hidden" name="pin" value={pin} />
          <fieldset>
            <legend>Enter the four digit gallery PIN</legend>
            <div className="gallery-pin__digits">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={digit}
                  maxLength={1}
                  aria-label={`PIN digit ${index + 1}`}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => handleKey(index, event)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
          </fieldset>
          {invalid ? <p className="gallery-pin__error">That PIN is not correct. Please try again.</p> : null}
          <button type="submit" disabled={pin.length !== 4 || submitting}>
            <span>{submitting ? "Opening Gallery" : "Open Gallery"}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="gallery-pin__viewer">
          <span>Signed in as {props.viewerEmail}</span>
          <a href={props.signOutHref}>Use another account</a>
        </div>
      </section>
    </main>
  );
}
