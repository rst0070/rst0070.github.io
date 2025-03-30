import Link from 'next/link'

const navItems = {
  '/': {
    name: 'home',
  },
  '/notes': {
    name: 'notes',
  },
}

export function Header() {
  return (
    <header>
        <nav
            className="flex flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
            id="nav"
        >
            <div className="flex flex-row space-x-0 pr-10">
            {Object.entries(navItems).map(([path, { name }]) => {
                return (
                <Link
                    key={path}
                    href={path}
                    className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1"
                >
                    {name}
                </Link>
                )
            })}
            </div>
        </nav>
    </header>
  )
}


function ArrowIcon() {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
          fill="currentColor"
        />
      </svg>
    )
}


export function Footer() {
    return (
      <footer className="mb-16">
        <ul className="font-sm mt-8 flex flex-col space-x-0 space-y-2 text-neutral-600 md:flex-row md:space-x-4 md:space-y-0 dark:text-neutral-300 items-center justify-center">
          <li>
            <a
              className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
              target="_blank"
              href="https://github.com/rst0070"
            >
              <ArrowIcon />
              <p className="ml-2 h-7">Github</p>
            </a>
          </li>
          <li>
            <a
              className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
              target="_blank"
              href="mailto:kwb0711@gmail.com"
            >
              <ArrowIcon />
              <p className="ml-2 h-7">Email</p>
            </a>
          </li>
        </ul>
        <p className="mt-8 text-neutral-600 dark:text-neutral-300 text-center w-full">
          © {new Date().getFullYear()} : rst0070
        </p>
      </footer>
    )
  }