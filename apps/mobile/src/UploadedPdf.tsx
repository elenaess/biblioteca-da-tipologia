import React,{useEffect,useState} from "react";
import {Linking,Pressable,Text,View} from "react-native";
import Pdf from "react-native-pdf";
import {repository} from "./client";
import type {Book} from "../../../packages/domain/src";
import OrbitLoader from "./OrbitLoader";
import {useLocale} from "./i18n/LocaleProvider";
export default function UploadedPdf({book}:{book:Book}){const {t}=useLocale();const [url,setUrl]=useState(""),[error,setError]=useState(""),[page,setPage]=useState("");useEffect(()=>{let alive=true;void repository?.pdfUrl(book).then((value)=>{if(alive)setUrl(value)}).catch(()=>{if(alive)setError(t("common.retry"))});return()=>{alive=false}},[book.file_path]);async function external(){try{if(repository)await Linking.openURL(await repository.pdfUrl(book))}catch{setError(t("common.retry"))}}return <View style={{flex:1}}><View style={{padding:12,flexDirection:"row",justifyContent:"space-between"}}><Text style={{color:"#6e5b42"}}>{page||t("pdf.viewer")}</Text><Pressable onPress={()=>void external()}><Text style={{color:"#914732"}}>{t("pdf.openFile")} ↗</Text></Pressable></View>{error?<View style={{padding:20,gap:12}}><Text style={{color:"#963d2c"}}>{error}</Text><Pressable onPress={()=>void external()}><Text style={{color:"#914732"}}>{t("pdf.openOriginal")} ↗</Text></Pressable></View>:url?<Pdf source={{uri:url,cache:false}} trustAllCerts={false} style={{flex:1,backgroundColor:"#e9dfce"}} onPageChanged={(p,total)=>setPage(p+" / "+total)} onError={()=>setError(t("common.retry"))}/>:<OrbitLoader label={t("pdf.opening")}/>}</View>}
