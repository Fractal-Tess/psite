{
  description = "A development environment for Node.js";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs = { nixpkgs, systems, ... }:
    let
      eachSystem = f:
        nixpkgs.lib.genAttrs (import systems)
          (system: f (import nixpkgs { inherit system; }));
    in
    {
      devShells = eachSystem (pkgs: {
        default = pkgs.mkShell {
          shellHook = ''
            echo "
                   _______
                  / / ___/
             __  / /\__ \ 
            / /_/ /___/ / 
            \____//____/  
            Bun - $(${pkgs.bun}/bin/bun --version)
            " | ${pkgs.lolcat}/bin/lolcat
          '';
          packages = with pkgs; [

            # Node.js (specified by overlay)
            bun
            # nodejs
            # deno

            # Package managers
            # pnpm
            # yarn
            # npm

            # Formatting & Linting
            prettierd
            eslint
            # biome

            # Additional tools
            # npkill
            gh
            # flyctl

            # LSP
            # svelte-language-server
            # emmet-language-server
            # tailwindcss-language-server
            # typescript-language-server
            # astro-language-server
            vscode-langservers-extracted

            # DevOps
            docker-compose-language-service
            dockerfile-language-server

            # Programming Languages
            nginx-language-server
          ];
        };
      });
    };
}
