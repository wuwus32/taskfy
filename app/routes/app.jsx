// REMIX AND SHOPIFY APP BRIDGE IMPORTS
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

// POLARIS STYLES LINKING
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// DATA LOADER (CURRENTLY EMPTY)
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const host = url.searchParams.get("host");
  
  return {
    host
  };
};

// MAIN SHOPIFY APPLICATION COMPONENT
export default function App() {
  const { host } = useLoaderData() || {};
  
  return (
    <AppProvider 
      isEmbeddedApp 
      apiKey={"be7cd1a63db0bb7160c999dbf6587db5"}
      host={host}
    >
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
         <Link to="/app/additional">
          Panel Settings
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// SHOPIFY REQUIRES REMIX FOR ERROR HANDLING
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

// HTTP HEADERS HANDLING
export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
