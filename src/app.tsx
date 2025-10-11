import { FaGithubSquare } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import { PiLinkedinLogoFill } from "react-icons/pi";

export function App() {
  return (
    <main className="min-h-screen w-full bg-gray-50 flex flex-col justify-between">
      <Header />
      <Content />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="w-full p-4 lg:p-10 flex justify-between [&>*]:text-black">
      <Logo />
      <Socials />
    </header>
  );
}

function Content() {
  return (
    <section className="flex flex-col items-center justify-center gap-2 px-8 md:px-4 text-justify-center">
      <h1 className="text-6xl md:text-5xl lg:text-8xl text-black antialiased tracking-tighter">
        felix hernandez vieyra
      </h1>
      <h2 className="text-3xl text-gray-800 tracking-tight hidden md:block">
        software engineer | web-application developer | tech enthusiast
      </h2>
      <p className="text-xl text-gray-700 max-w-5xl leading-relaxed py-4 text-justify">
        passionate about building software that solves user's problems. love the bleeding-edge, firm believer in
        perpetual learning. design software for humans. architect solutions for resilience. security must be part of the
        mvp. simple is better than complex. complex is better than complicated. actions transmit values better than
        words.
      </p>
      <GetInTouch />
    </section>
  );
}

function Footer() {
  return (
    <footer className=" w-full p-4 md:p-10 bg-black">
      <nav className="w-full flex justify-center md:justify-between items-center [&>*]:text-white">
        <Logo className="hidden md:inline" />
        <p className="text-md md:text-md">developed by yours truly, with much 🧉 © {new Date().getFullYear()}</p>
        <Socials className="hidden md:flex" />
      </nav>
    </footer>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <a href="/">
      <h1 className={`text-4xl tracking-tighter ${className}`}>whoami</h1>
    </a>
  );
}

function Socials({ className }: { className?: string }) {
  return (
    <ul className={`flex gap-1 [&>*]:cursor-pointer ${className}`}>
      <li>
        <a href="https://www.linkedin.com/in/felix-hernandez-vieyra/" target="_blank" rel="noopener noreferrer">
          <PiLinkedinLogoFill size={33} />
        </a>
      </li>
      <li>
        <a href="https://github.com/Felix-Hz" target="_blank" rel="noopener noreferrer">
          <FaGithubSquare size={32} />
        </a>
      </li>
    </ul>
  );
}

function GetInTouch() {
  return (
    <h2 className="py-2 px-4 bg-black rounded-md max-w-3xl text-center">
      <a className="[&>*]:inline font-extrabold font-stretch-extra-expanded text-xl" href="mailto:me@felix-hzv.dev">
        let's talk &rarr; me@felix-hzv.dev <IoIosMail />
      </a>
    </h2>
  );
}
