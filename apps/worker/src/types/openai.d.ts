declare module "openai" {
  // Minimal type to satisfy the compiler; real types come from the runtime package.
  const OpenAI: any;
  export default OpenAI;
}


