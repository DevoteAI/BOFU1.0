import OpenAI from 'openai';

export interface ScrapedBlog {
  url: string;
  title: string;
  content: string;
  error?: string;
  status: 'scraped' | 'error';
  citations?: Array<{url: string; title: string;}>;
}

// Initialize the OpenAI client
// In a production environment, the API key should be stored in environment variables
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'Your API Key Here',
  dangerouslyAllowBrowser: true // Only for demo purposes, in production use server-side API calls
});

export async function scrapeBlogContent(url: string): Promise<ScrapedBlog> {
  try {
    console.log(`Attempting to extract content from: ${url} using OpenAI Web Search`);
    
    // First check if the URL is valid
    try {
      new URL(url);
    } catch (e) {
      return {
        url,
        title: url,
        content: "",
        error: "Invalid URL format",
        status: "error"
      };
    }

    // Use OpenAI's web search to extract the content
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",
      web_search_options: {
        search_context_size: "medium", // Balance between quality and speed
      },
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts and summarizes blog content."
        },
        {
          role: "user",
          content: `Visit this blog URL: ${url} and extract the full content. 
          - Include the title, author (if available), and publication date (if available)
          - Extract the entire text content faithfully
          - Preserve the structure (headers, paragraphs, lists)
          - Skip any comments, ads, and unrelated sections
          - Format the content with proper markdown: use ## for headings, * for bullet points, etc.
          - Include a summary at the top (100 words max)
          `
        }
      ],
    });

    // Extract the content from the API response
    const content = response.choices[0].message.content || '';
    
    // Extract citations if available
    const citations = response.choices[0].message.annotations?.filter(
      annotation => annotation.type === 'url_citation'
    ).map(annotation => {
      if ('url_citation' in annotation) {
        return {
          url: annotation.url_citation.url,
          title: annotation.url_citation.title
        };
      }
      return null;
    }).filter(Boolean) as Array<{url: string; title: string;}> || [];

    // Extract a title from the content (usually the first line)
    const title = content.split('\n')[0].replace(/^#+ /, '').trim() || 
                  url.split('/').pop()?.replace(/-/g, ' ') || 
                  'Blog Content';

    return {
      url,
      title,
      content,
      citations,
      status: 'scraped'
    };
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    
    // If API key is not set or invalid, provide a helpful error message
    if (error instanceof Error && 
       (error.message.includes('API key') || 
        error.message.includes('authentication') || 
        error.message.includes('401'))) {
      return {
        url,
        title: url,
        content: `[OpenAI API key is missing or invalid]\n\nTo extract blog content, you need to set your OpenAI API key in the environment variables (VITE_OPENAI_API_KEY).\n\nFor now, we've submitted the URL for reference.`,
        error: "OpenAI API key is missing or invalid",
        status: 'error'
      };
    }
    
    return {
      url,
      title: url,
      content: `[Error occurred while processing ${url}]\n\nWe couldn't extract the content of this blog post. The URL has been submitted for reference.`,
      error: error instanceof Error ? error.message : 'Unknown error processing blog URL',
      status: 'error'
    };
  }
}