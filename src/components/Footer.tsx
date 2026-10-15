export default function Footer() {
  return (
    <footer className="w-full border-t border-primary/10 bg-card/30 py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md shadow-primary/20">
                靓
              </div>
              <span className="text-lg font-bold text-foreground">靓文写作</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              AI 驱动的智能写作平台——拆书学习、扫榜洞察、去 AI 味润色，
              让每一篇文字都闪耀创作者的独特光芒。
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">产品功能</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">AI 小说创作</li>
              <li className="hover:text-primary cursor-pointer transition-colors">智能拆书分析</li>
              <li className="hover:text-primary cursor-pointer transition-colors">网文排行榜</li>
              <li className="hover:text-primary cursor-pointer transition-colors">去 AI 味优化</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">关于我们</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">用户协议</li>
              <li className="hover:text-primary cursor-pointer transition-colors">隐私政策</li>
              <li className="hover:text-primary cursor-pointer transition-colors">联系我们</li>
              <li className="hover:text-primary cursor-pointer transition-colors">帮助中心</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 靓文写作. 保留所有权利.
          </p>
          <p className="text-xs text-muted-foreground">
            AI 赋能创作 · 让文字更有力量
          </p>
        </div>
      </div>
    </footer>
  );
}
