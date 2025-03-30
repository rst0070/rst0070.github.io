import { Note } from "@/core/entities";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const components = {

}

// const components = {
//     h1: (props: any) => <h1 className="text-3xl font-bold my-4" {...props} />,
//     h2: (props: any) => <h2 className="text-2xl font-semibold my-3" {...props} />,
//     h3: (props: any) => <h3 className="text-xl font-semibold my-2" {...props} />,
//     p: (props: any) => <p className="my-2" {...props} />,
//     a: (props: any) => <a className="text-blue-600 hover:underline" {...props} />,
//     // Add more component customizations as needed
// }
export async function NoteMdx({ note }: { note: Note}) {
    const {content, metadata} = note
    
    return (
        <div>
            <h1>{metadata.title}</h1>
            <MDXRemote 
                source={content} 
                components={components} 
                options={{
                    mdxOptions: {
                        remarkPlugins: [remarkGfm, remarkMath],
                        rehypePlugins: [rehypeKatex],
                    },
                }}
            />
        </div>
    )
}