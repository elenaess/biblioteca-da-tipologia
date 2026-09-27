import { supabase } from './supabase';import type{Book,Publication}from'./types';
export async function listBooks(){const{data,error}=await supabase.from('books').select('*').order('title');if(error)throw error;return(data??[])as Book[]}
export async function getBook(id:string){const{data,error}=await supabase.from('books').select('*').eq('id',id).single();if(error)throw error;return data as Book}
export async function listPublications(kind:string){const{data,error}=await supabase.from('publications').select('*').eq('kind',kind).order('title');if(error)throw error;return(data??[])as Publication[]}
export async function getPublication(id:string){const{data,error}=await supabase.from('publications').select('*').eq('id',id).single();if(error)throw error;return data as Publication}
export async function getMyRole(){const{data}=await supabase.rpc('my_role');return(data as string|null)??null}
export async function claimOwner(){const{data}=await supabase.rpc('claim_owner');return(data as string|null)??getMyRole()}
