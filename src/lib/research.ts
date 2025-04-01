import { supabase } from './supabase';
import { ProductAnalysis } from '../types/product';

export interface ResearchResult {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  data: ProductAnalysis[];
  is_draft: boolean;
}

export async function saveResearchResults(results: ProductAnalysis[], title: string, isDraft = false): Promise<string> {
  try {
    // If results is an array with one item, use it directly, otherwise wrap single result in array
    const dataToSave = Array.isArray(results) ? results : [results];
    
    const { data, error } = await supabase
      .from('research_results')
      .insert({
        title,
        data: dataToSave,
        is_draft: isDraft,
        user_id: undefined  // Let the database set this automatically
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving research results:', error);
    throw error;
  }
}

export async function updateResearchResults(id: string, results: ProductAnalysis[], title: string, isDraft = false): Promise<void> {
  try {
    const { error } = await supabase
      .from('research_results')
      .update({
        title,
        data: results,
        is_draft: isDraft
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating research results:', error);
    throw error;
  }
}

export async function getResearchResults(): Promise<ResearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('research_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching research results:', error);
    throw error;
  }
}

export async function getResearchResultById(id: string): Promise<ResearchResult | null> {
  try {
    const { data, error } = await supabase
      .from('research_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching research result:', error);
    throw error;
  }
}

export async function deleteResearchResult(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('research_results')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting research result:', error);
    throw error;
  }
}