import Link from "next/link";


const Navigation = () => {
  return (
    <header className="absolute top-4 left-0 right-0 text-white px-[2em] z-10">
      <div className="">
        <Link className="text-white" href='/'>Logo</Link>
      </div>
    </header>
  )
}

export default Navigation;