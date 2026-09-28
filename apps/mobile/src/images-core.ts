import { classifyPublicationImageSource } from "../../../packages/domain/src/publication-images";
export type PublicationImageResolution={kind:"asset";key:string}|{kind:"remote";uri:string}|{kind:"data";uri:string}|{kind:"missing"};
export function classifyPublicationImage(src:string):PublicationImageResolution{const source=classifyPublicationImageSource(src);if(source.kind==="local")return{kind:"asset",key:source.key};return source;}
export function rewritePublicationHtml(html:string,assetUri:(key:string)=>string|undefined,fallbackUri:string):string{return html.replace(/\bsrc=(['"])(.*?)\1/gi,(_match,quote:string,raw:string)=>{const resolved=classifyPublicationImage(raw);const uri=resolved.kind==="asset"?assetUri(resolved.key)||fallbackUri:resolved.kind==="remote"||resolved.kind==="data"?resolved.uri:fallbackUri;return `src=${quote}${uri}${quote}`})}
export function isRemoteImageUrl(value:string|null|undefined):boolean{return !!value&&classifyPublicationImage(value).kind==="remote"}
