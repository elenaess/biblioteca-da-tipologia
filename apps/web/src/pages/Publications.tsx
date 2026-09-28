import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, FileText, ExternalLink, Pencil } from "lucide-react";
import { useLibrary } from "../context";
import { canManage, topicLabelLocalized, TOPICS } from "../../../../packages/domain/src";
import { sanitizeHtml } from "../rich-content";
import { resolveWebPublicationHtml } from "../publication-images";
import { useLocale } from "../i18n/LocaleContext";
import Comments from "../components/Comments";
export function Publications({ base = false }: { base?: boolean }) {
  const { publications, preview, role } = useLibrary(); const { locale, t } = useLocale(); const [topic,setTopic]=useState("");
  const list=publications.filter((p)=>(base?p.kind==="base_text":p.kind!=="base_text")&&(!topic||p.topics.includes(topic)));
  return <><header className="page-heading"><div><div className="eyebrow">{base?t("publication.foundations"):t("publication.perspectives")}</div><h1>{base?t("publication.readings"):t("publication.articles")}</h1><p>{base?t("publication.readingsSubtitle"):t("publication.articlesSubtitle")}</p></div><FileText className="heading-icon" size={42}/></header>
    <div className="topic-tabs"><button className={!topic?"active":""} onClick={()=>setTopic("")}>{t("library.allTopics")}</button>{TOPICS.map((x)=><button key={x.id} className={topic===x.id?"active":""} onClick={()=>setTopic(x.id)}>{topicLabelLocalized(x.id, locale)}</button>)}</div>
    <div className="publication-list">{list.map((p,i)=><div className="publication-item" key={p.id}><Link className="publication-card" to={"/texto/"+p.id}><span className="publication-number">{String(i+1).padStart(2,"0")}</span><div><span className="book-category">{p.topics.map((x)=>topicLabelLocalized(x,locale)).join(" · ")}</span><h2 data-no-i18n>{p.title}</h2><p data-no-i18n>{p.summary}</p><span className="muted" data-no-i18n>{p.author_name||t("publication.archiveText")}{p.status==="draft"?" · "+t("common.draft"):""}</span></div><ArrowUpRight size={23}/></Link>{canManage(role)&&<Link className="edit-pencil" to={"/admin/texto/"+p.id} aria-label={t("common.edit")+" "+p.title} title={t("common.edit")}><Pencil size={17}/></Link>}</div>)}</div>
    {!list.length&&<div className="empty"><FileText size={32}/><h2>{t("publication.emptyTitle")}</h2><p>{t("publication.empty")}</p>{preview&&<Link className="button secondary" to="/editor">{t("common.edit")}</Link>}</div>}
  </>;
}
export function PublicationDetail(){
  const {id}=useParams(); const {publications,role,loading}=useLibrary(); const {locale,t,dateLocale}=useLocale(); const p=publications.find((x)=>x.id===id); const [font,setFont]=useState(18);
  const html=useMemo(()=>sanitizeHtml(resolveWebPublicationHtml(p?.html||"",new URL(import.meta.env.BASE_URL,window.location.origin).toString())),[p?.html]);
  if(loading)return <p>{t("common.loading")}</p>;
  if(!p)return <div className="empty"><h1>{t("publication.notFound")}</h1><Link to="/textos-base">{t("publication.backTexts")}</Link></div>;
  return <article className="article-page"><Link className="back-link" to={p.kind==="base_text"?"/textos-base":"/artigos"}><ArrowLeft size={16}/>{t("publication.backTexts")}</Link><div className="pills">{p.topics.map((x)=><span key={x}>{topicLabelLocalized(x,locale)}</span>)}</div><h1 data-no-i18n>{p.title}</h1><p className="byline" data-no-i18n>{p.author_name||t("publication.archiveText")}{p.published_at?" · "+new Date(p.published_at).toLocaleDateString(dateLocale):""}</p><div className="article-tools"><div><button aria-label={t("publication.decreaseText")} onClick={()=>setFont(Math.max(16,font-2))}>A−</button><button aria-label={t("publication.increaseText")} onClick={()=>setFont(Math.min(26,font+2))}>A+</button></div>{p.source_url&&<a href={p.source_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>{t("common.originalDocument")}</a>}{canManage(role)&&<Link to={"/admin/texto/"+p.id}><Pencil size={16}/>{t("common.edit")}</Link>}</div><div className="rich-content" data-no-i18n style={{fontSize:font}} dangerouslySetInnerHTML={{__html:html}}/><Comments kind="publication" id={p.id}/></article>;
}
