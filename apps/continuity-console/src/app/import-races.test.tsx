import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
const key="ags.continuity-console.local-evidence-snapshot";
function snapshot(name: string) { return {schemaVersion:"ags.continuity-snapshot.v0.1",generatedAt:"2026-09-22T12:00:00Z",deployment:{id:name,name,environment:"local"},artifacts:[],diagnostics:[]}; }
function deferred<T>() { let resolve!: (v:T)=>void; let reject!: (error:Error)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; }
const response=(name:string)=>({ok:true,json:async()=>snapshot(name)}) as Response;
const mode=()=>document.querySelector(".sidebar-footer")!.textContent;
async function openSettings(){render(<App/>); const user=userEvent.setup();await user.click(within(await screen.findByRole("navigation")).getByRole("button",{name:"Settings"})); return user;}
beforeEach(()=>window.localStorage.clear());
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe("import operation ordering",()=>{
  it.each([false,true])("clear invalidates a slow bundled fetch, including failure (%s)",async fail=>{
    const pending=deferred<Response>();vi.stubGlobal("fetch",vi.fn(()=>pending.promise));const user=await openSettings();
    await user.click(screen.getByRole("button",{name:"Load bundled snapshot"}));await user.click(screen.getByRole("button",{name:"Clear to Sample Mode"}));
    await act(async()=>{if(fail)pending.reject(new Error("Old reload failed"));else pending.resolve(response("STALE"));await pending.promise.catch(()=>{});});
    expect(mode()).toContain("Sample Mode");expect(mode()).not.toContain("STALE");expect(window.localStorage.getItem(key)).toBeNull();
  });
  it("clear invalidates a slow file read",async()=>{
    const pending=deferred<string>();const user=await openSettings();const file=new File([""],"slow.json",{type:"application/json"});Object.defineProperty(file,"text",{value:()=>pending.promise});
    fireEvent.change(document.querySelector('input[type="file"]')!,{target:{files:[file]}});
    await user.click(screen.getByRole("button",{name:"Clear to Sample Mode"}));
    await act(async()=>{pending.resolve(JSON.stringify(snapshot("STALE FILE")));await pending.promise;});
    expect(mode()).toContain("Sample Mode");expect(window.localStorage.getItem(key)).toBeNull();
  });
  it("operator order wins when import A completes after B",async()=>{
    const a=deferred<Response>();const b=deferred<Response>();vi.stubGlobal("fetch",vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise));
    const user=await openSettings();await user.click(screen.getByRole("button",{name:"Load bundled snapshot"}));await user.click(screen.getByRole("button",{name:"Reload bundled snapshot"}));
    await act(async()=>{b.resolve(response("LATEST B"));await b.promise;});
    await act(async()=>{a.resolve(response("OLD A"));await a.promise;});
    expect(mode()).toContain("LATEST B");expect(window.localStorage.getItem(key)).toContain("LATEST B");expect(mode()).not.toContain("OLD A");
  });
  it.each(["{bad json", "null", "false", "", '"garbage"'])("corrupt saved evidence %s starts with a visible local recovery diagnostic",async raw=>{
    window.localStorage.setItem(key,raw);render(<App/>);
    await screen.findByText(/Saved local evidence is corrupt/);
    expect(mode()).toContain("Local Evidence Mode");expect(mode()).not.toContain("Sample Mode");
  });
  it("retains a failed replacement diagnostic across restart instead of restoring old evidence", async () => {
    window.localStorage.setItem(key, JSON.stringify(snapshot("OLD EVIDENCE")));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Replacement failed")));
    const user = await openSettings();
    await user.click(screen.getByRole("button", {name:"Reload bundled snapshot"}));
    await screen.findByText("Replacement failed");
    cleanup(); render(<App/>);
    await screen.findByText("Replacement failed");
    expect(mode()).toContain("Local Evidence Mode");
    expect(mode()).not.toContain("OLD EVIDENCE");
  });
});
