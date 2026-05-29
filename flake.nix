{
  description = "ScottyLabs Documentation Hub";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            git
            cargo
            rustc
            rustfmt
            rust-analyzer
            nodejs_20
          ];

          shellHook = ''
            echo "ScottyLabs Documentation Hub Development Environment"
            echo ""
            echo "Available commands:"
            echo "  bun install    - Install dependencies"
            echo "  bun run dev    - Start development server"
            echo "  bun run build  - Build documentation"
            echo "  nix build      - Build static site package (needs network)"
            echo ""
          '';
        };

        packages = {
          # Static site built from this repo. Clones governance + project repos
          # during build, so run with: nix build --impure .#site
          site = pkgs.stdenv.mkDerivation {
            pname = "scottylabs-docs";
            inherit version;
            src = ./.;

            nativeBuildInputs = with pkgs; [
              bun
              git
              cargo
              rustc
              nodejs_20
            ];

            # Required: build script fetches Codeberg repos at build time.
            __impure = true;

            buildPhase = ''
              export HOME="$TMPDIR"
              bun install --frozen-lockfile
              bun run build
              ${pkgs.bun}/bin/bun x astro build
            '';

            installPhase = ''
              mkdir -p "$out"
              cp -r dist/* "$out/"
            '';
          };

          upload-garage = pkgs.writeShellScriptBin "upload-garage" ''
            set -euo pipefail

            : "''${GARAGE_ENDPOINT:?GARAGE_ENDPOINT must be set}"
            : "''${GARAGE_ACCESS_KEY:?GARAGE_ACCESS_KEY must be set}"
            : "''${GARAGE_SECRET_KEY:?GARAGE_SECRET_KEY must be set}"
            : "''${GARAGE_BUCKET:?GARAGE_BUCKET must be set}"

            SITE=''${1:-dist}

            echo "📤 Uploading to Garage S3..."

            export AWS_ACCESS_KEY_ID="$GARAGE_ACCESS_KEY"
            export AWS_SECRET_ACCESS_KEY="$GARAGE_SECRET_KEY"
            export AWS_ENDPOINT_URL="$GARAGE_ENDPOINT"

            ${pkgs.awscli2}/bin/aws s3 sync "$SITE/" "s3://$GARAGE_BUCKET/" \
              --delete \
              --cache-control "public, max-age=3600"

            echo "✅ Upload complete"
            echo "📦 Documentation available at https://docs.scottylabs.org"
          '';

          default = self.packages.${system}.upload-garage;
        };

        apps = {
          upload-garage = {
            type = "app";
            program = "${self.packages.${system}.upload-garage}/bin/upload-garage";
          };

          default = self.apps.${system}.upload-garage;
        };
      }
    );
}
