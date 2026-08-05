import { RepoSample } from "./types";

export const SAMPLE_REPOSITORIES: RepoSample[] = [
  {
    id: "circular-loop-demo",
    name: "⚠️ Circular Loop & Coupling Testbed",
    description: "Contains multi-node circular dependency loops & high-risk single points of failure to test DFS cycle detection.",
    category: "Architecture Diagnostics",
    files: [
      {
        path: "app/page.tsx",
        code: `import React from "react";
import { Header } from "@/components/Header";
import { UserProfile } from "@/components/UserProfile";
import { authService } from "@/services/authService";

export default function HomePage() {
  const user = authService.getCurrentUser();
  return (
    <main>
      <Header />
      <UserProfile user={user} />
    </main>
  );
}`,
      },
      {
        path: "components/Header.tsx",
        code: `import React from "react";
import { authService } from "@/services/authService";
import { themeConfig } from "@/config/theme";

export function Header() {
  return (
    <header style={{ color: themeConfig.primary }}>
      <h1>Dashboard App</h1>
      <button onClick={() => authService.logout()}>Logout</button>
    </header>
  );
}`,
      },
      {
        path: "components/UserProfile.tsx",
        code: `import React from "react";
import { apiClient } from "@/lib/apiClient";
import { Avatar } from "@/components/Avatar";

export function UserProfile({ user }: { user: any }) {
  return (
    <div>
      <Avatar url={user?.avatar} />
      <p>{user?.name}</p>
    </div>
  );
}`,
      },
      {
        path: "components/Avatar.tsx",
        code: `import React from "react";
import { themeConfig } from "@/config/theme";
import { UserProfile } from "@/components/UserProfile"; // INTENTIONAL CIRCULAR IMPORT!

export function Avatar({ url }: { url: string }) {
  return <img src={url} className={themeConfig.avatarBorder} />;
}`,
      },
      {
        path: "services/authService.ts",
        code: `import { apiClient } from "@/lib/apiClient";
import { tokenStorage } from "@/utils/tokenStorage";

export const authService = {
  getCurrentUser() {
    const token = tokenStorage.getToken();
    return apiClient.get("/user", token);
  },
  logout() {
    tokenStorage.clearToken();
  }
};`,
      },
      {
        path: "lib/apiClient.ts",
        code: `import { tokenStorage } from "@/utils/tokenStorage";
import { logger } from "@/utils/logger";

export const apiClient = {
  get(url: string, token?: string) {
    logger.log("GET Request to " + url);
    if (!token) {
      tokenStorage.handleExpiredSession(); // INTENTIONAL CIRCULAR IMPORT!
    }
    return { name: "Alex Developer", avatar: "/avatar.png" };
  }
};`,
      },
      {
        path: "utils/tokenStorage.ts",
        code: `import { authService } from "@/services/authService"; // INTENTIONAL CIRCULAR IMPORT!
import { logger } from "@/utils/logger";

export const tokenStorage = {
  getToken() {
    return localStorage.getItem("app_token");
  },
  clearToken() {
    localStorage.removeItem("app_token");
  },
  handleExpiredSession() {
    logger.log("Session expired");
    authService.logout();
  }
};`,
      },
      {
        path: "utils/logger.ts",
        code: `import { themeConfig } from "@/config/theme";

export const logger = {
  log(msg: string) {
    console.log("%c [LOG]: " + msg, "color: " + themeConfig.logColor);
  }
};`,
      },
      {
        path: "config/theme.ts",
        code: `export const themeConfig = {
  primary: "#6366f1",
  logColor: "#10b981",
  avatarBorder: "rounded-full border-2"
};`,
      },
    ],
  },
  {
    id: "nextjs-ecommerce",
    name: "🛒 Next.js Modern E-Commerce Platform",
    description: "Production Next.js 14 App Router codebase with components, routes, state hooks, and API integration.",
    category: "Fullstack Web App",
    files: [
      {
        path: "app/page.tsx",
        code: `import React from "react";
import { Navbar } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductGrid";
import { CartDrawer } from "@/components/CartDrawer";
import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main>
      <Navbar title={siteConfig.name} />
      <ProductGrid />
      <CartDrawer />
    </main>
  );
}`,
      },
      {
        path: "app/products/[id]/page.tsx",
        code: `import React from "react";
import { Navbar } from "@/components/Navbar";
import { ProductDetail } from "@/components/ProductDetail";
import { getProductById } from "@/lib/api";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  return (
    <div>
      <Navbar />
      <ProductDetail product={product} />
    </div>
  );
}`,
      },
      {
        path: "components/Navbar.tsx",
        code: `import React from "react";
import { CartBadge } from "@/components/CartBadge";
import { SearchBar } from "@/components/SearchBar";
import { useCart } from "@/hooks/useCart";

export function Navbar({ title = "Store" }) {
  const { itemCount } = useCart();
  return (
    <nav className="flex justify-between p-4 bg-slate-900">
      <h1>{title}</h1>
      <SearchBar />
      <CartBadge count={itemCount} />
    </nav>
  );
}`,
      },
      {
        path: "components/ProductGrid.tsx",
        code: `import React from "react";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts } from "@/lib/api";

export function ProductGrid() {
  const products = fetchProducts();
  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}`,
      },
      {
        path: "components/ProductCard.tsx",
        code: `import React from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";

export function ProductCard({ product }: { product: any }) {
  const { addToCart } = useCart();
  return (
    <div className="p-4 border rounded">
      <h3>{product.name}</h3>
      <span>{formatCurrency(product.price)}</span>
      <Button onClick={() => addToCart(product)}>Add to Cart</Button>
    </div>
  );
}`,
      },
      {
        path: "components/ProductDetail.tsx",
        code: `import React from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";

export function ProductDetail({ product }: { product: any }) {
  const { addToCart } = useCart();
  return (
    <div>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <span>{formatCurrency(product.price)}</span>
      <Button onClick={() => addToCart(product)}>Buy Now</Button>
    </div>
  );
}`,
      },
      {
        path: "components/CartDrawer.tsx",
        code: `import React from "react";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function CartDrawer() {
  const { items, total } = useCart();
  return (
    <aside className="fixed right-0 top-0 w-80 bg-slate-800 p-4">
      <h2>Cart Total: {formatCurrency(total)}</h2>
      <Button variant="primary">Checkout</Button>
    </aside>
  );
}`,
      },
      {
        path: "components/CartBadge.tsx",
        code: `import React from "react";
export function CartBadge({ count }: { count: number }) {
  return <span className="bg-indigo-600 rounded-full px-2">{count}</span>;
}`,
      },
      {
        path: "components/SearchBar.tsx",
        code: `import React from "react";
import { formatSearchQuery } from "@/lib/utils";

export function SearchBar() {
  return <input type="text" placeholder="Search..." onChange={(e) => formatSearchQuery(e.target.value)} />;
}`,
      },
      {
        path: "components/ui/Button.tsx",
        code: `import React from "react";
import { cn } from "@/lib/utils";

export function Button({ children, variant = "default", onClick }: any) {
  return <button className={cn("btn", variant)} onClick={onClick}>{children}</button>;
}`,
      },
      {
        path: "hooks/useCart.ts",
        code: `import { create } from "zustand";
import { calculateCartTotal } from "@/lib/utils";

export const useCart = () => {
  return { itemCount: 3, total: 149.99, items: [], addToCart: (p: any) => {} };
};`,
      },
      {
        path: "lib/api.ts",
        code: `import { siteConfig } from "@/config/site";

export async function fetchProducts() {
  return [{ id: "1", name: "Wireless Headphones", price: 199.99 }];
}

export async function getProductById(id: string) {
  return { id, name: "Sample Item", price: 49.99, description: "Quality item" };
}`,
      },
      {
        path: "lib/utils.ts",
        code: `export function formatCurrency(amount: number) {
  return "$" + amount.toFixed(2);
}

export function formatSearchQuery(q: string) {
  return q.trim().toLowerCase();
}

export function calculateCartTotal(items: any[]) {
  return items.reduce((acc, item) => acc + item.price, 0);
}

export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}`,
      },
      {
        path: "config/site.ts",
        code: `export const siteConfig = {
  name: "Cartofy Market",
  domain: "https://cartofy.dev"
};`,
      },
    ],
  },
  {
    id: "ui-design-system",
    name: "🎨 Enterprise UI Design System Component Hub",
    description: "Atomic component library with tokens, atomic utilities, modals, inputs, and accessibility helpers.",
    category: "Design System",
    files: [
      {
        path: "components/index.ts",
        code: `export { Button } from "./Button";
export { Modal } from "./Modal";
export { Dropdown } from "./Dropdown";
export { Tooltip } from "./Tooltip";
export { Input } from "./Input";`,
      },
      {
        path: "components/Button.tsx",
        code: `import React from "react";
import { theme } from "@/styles/theme";
import { cn } from "@/utils/cn";

export function Button({ label, variant }: any) {
  return <button style={{ background: theme.colors.primary }} className={cn(variant)}>{label}</button>;
}`,
      },
      {
        path: "components/Modal.tsx",
        code: `import React from "react";
import { Button } from "./Button";
import { useA11yFocus } from "@/utils/a11y";
import { theme } from "@/styles/theme";

export function Modal({ isOpen, onClose, children }: any) {
  useA11yFocus(isOpen);
  if (!isOpen) return null;
  return (
    <div style={{ background: theme.colors.overlay }}>
      <div>{children}</div>
      <Button label="Close" onClick={onClose} />
    </div>
  );
}`,
      },
      {
        path: "components/Dropdown.tsx",
        code: `import React from "react";
import { Button } from "./Button";
import { cn } from "@/utils/cn";

export function Dropdown({ items }: any) {
  return (
    <div className={cn("dropdown")}>
      <Button label="Menu" />
      <ul>{items.map((i: string) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}`,
      },
      {
        path: "components/Tooltip.tsx",
        code: `import React from "react";
import { theme } from "@/styles/theme";

export function Tooltip({ text }: { text: string }) {
  return <span style={{ color: theme.colors.text }}>{text}</span>;
}`,
      },
      {
        path: "components/Input.tsx",
        code: `import React from "react";
import { cn } from "@/utils/cn";

export function Input(props: any) {
  return <input className={cn("input-field")} {...props} />;
}`,
      },
      {
        path: "utils/cn.ts",
        code: `export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}`,
      },
      {
        path: "utils/a11y.ts",
        code: `import { theme } from "@/styles/theme";

export function useA11yFocus(active: boolean) {
  if (active) console.log("Focus trapped on theme accent: " + theme.colors.accent);
}`,
      },
      {
        path: "styles/theme.ts",
        code: `export const theme = {
  colors: {
    primary: "#3b82f6",
    overlay: "rgba(0,0,0,0.5)",
    text: "#f8fafc",
    accent: "#ec4899"
  }
};`,
      },
    ],
  },
];
