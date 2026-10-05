import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_POLICY_VERSION,
  CONSENT_SCHEMA,
  CONSENT_UI_VERSION,
} from "./config";

/**
 * Runs inline in <head>, before the first paint: if a current decision is
 * stored, mark <html data-consent="decided"> so the server-rendered banner is
 * hidden by CSS and never flashes. No decision → nothing happens and the banner
 * is simply there in the HTML, with no layout shift (it is position: fixed) and
 * nothing in front of the LCP element's request.
 *
 * Same rules as `isCurrent` in ./client.ts.
 */
export const CONSENT_PREPAINT = `(function(){try{
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(!m)return;
var r=JSON.parse(decodeURIComponent(m[1]));var age=Date.now()-Date.parse(r.at);
if(r.schema===${JSON.stringify(CONSENT_SCHEMA)}&&r.ui===${JSON.stringify(CONSENT_UI_VERSION)}&&r.policy===${JSON.stringify(CONSENT_POLICY_VERSION)}&&age>=0&&age<${CONSENT_MAX_AGE_DAYS * 86_400_000})
document.documentElement.setAttribute("data-consent","decided");
}catch(e){}})();`;
