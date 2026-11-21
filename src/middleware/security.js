// @ts-check
import helmet from 'helmet';

/**
 * Astryx injects one <style> element with popover slide animations. Its exact content is allowed by
 * hash instead of 'unsafe-inline'. The package version is pinned, so this only changes on an upgrade;
 * if it does, only the animation is lost, and the new hash is printed in the browser console violation.
 */
const ASTRYX_LAYER_STYLE_HASH = "'sha256-/i2+VVt2qoVh0Ag9OWwyc9593DCZeYGAv6SliqVbheY='";

/** Browser features the page may use; everything else is denied. */
const PERMISSIONS_POLICY = 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()';

/**
 * Security headers: a strict Content Security Policy plus the usual Helmet defaults.
 * @returns {import('express').RequestHandler[]}
 */
export function securityHeaders() {
  return [
    helmet({
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'"],
          styleSrcElem: ["'self'", ASTRYX_LAYER_STYLE_HASH],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
    (_req, res, next) => {
      res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
      next();
    },
  ];
}
