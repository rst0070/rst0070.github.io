import { Note } from "@/core/entities";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeStarryNight from 'rehype-starry-night';
import rehypeStringify from 'rehype-stringify';
import {CodeBlock, github as githubTheme} from 'react-code-blocks';
import rehypeRaw from "rehype-raw";
import remarkRehype from 'remark-rehype';

// function CustomCodeBlock({ props }: { props: any }) {
//     console.log("CustomCodeBlock")
//     console.log(props)
//     return (
//         <CodeBlock
//             language={props.className.split('-')[1]}
//             text={props.children}
//             theme={githubTheme}
//         />
//     )
// }

// const components = {
//     //code: (props: any) => <CustomCodeBlock {...props} />
// }

const components = {
    
    h1: (props: any) => {
        let id = props.children
        return <h1 id={id} {...props} />
    },
    h2: (props: any) => {
        let id = props.children.replaceAll(' ', '-').replace('.', '')
        return <h2 id={id} {...props} />
    },
    h3: (props: any) => {
        console.log(props)
        return <h3 {...props} />
    },
    p: (props: any) => <p className="my-2" {...props} />,
    a: (props: any) => <a {...props} />,

    ol: (props: any) => {
        return <ol className="list-decimal block" {...props} />
    },

    ul: (props: any) => {
        return <ul className="list-disc block" {...props} />
    },
    // Add more component customizations as needed
}
export async function NoteMdx({ note }: { note: Note}) {
    const {content, metadata} = note
    
    return (
        <article className="prose">
            <h1 className="title font-semibold text-2xl tracking-tighter">{metadata.title}</h1>
            <div className="flex justify-between items-center mt-2 mb-8 text-sm">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Last Updated: {metadata.date || metadata.lastmod}</p>
            </div>
            <MDXRemote 
                source={content} 
                components={components} 
                options={{
                    mdxOptions: {
                        remarkPlugins: [
                            remarkGfm, 
                            remarkMath,
                        ],
                        rehypePlugins: [
                            rehypeKatex,
                            rehypeHighlight,
                        ],
                        format: 'mdx'
                    },
                }}
            />
        </article>
    )
}