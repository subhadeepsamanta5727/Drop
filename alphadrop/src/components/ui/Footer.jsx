export function Footer() {
  return (
    <footer className="border-t border-blue-900/60 bg-[#071a37] px-4 py-3 text-blue-200 lg:px-6">
      <div className="mx-auto flex max-w-[1500px] items-center justify-center text-center text-[11px]">
        <p>© {new Date().getFullYear()} BizDataPro. All rights reserved.</p>
      </div>
    </footer>
  )
}
