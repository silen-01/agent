type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
  };
};

export function isLikelyPhoneDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const uaData = (navigator as NavigatorWithUserAgentData).userAgentData;
  if (uaData?.mobile) return true;

  const ua = navigator.userAgent ?? "";
  const isPhoneUserAgent =
    /iPhone|iPod|Windows Phone|IEMobile|Opera Mini|Android.+Mobile/i.test(ua);
  if (isPhoneUserAgent) return true;

  if (typeof window.matchMedia === "function") {
    const isNarrowTouchPhone = window.matchMedia("(max-width: 767px) and (pointer: coarse)")
      .matches;
    if (isNarrowTouchPhone) return true;
  }

  return false;
}

export function isScreenShareAvailable(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const mediaDevices = navigator.mediaDevices as MediaDevices & {
    getDisplayMedia?: typeof navigator.mediaDevices.getDisplayMedia;
  };
  if (typeof mediaDevices?.getDisplayMedia !== "function") return false;

  return !isLikelyPhoneDevice();
}
