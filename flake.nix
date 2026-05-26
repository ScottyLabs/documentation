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
            echo ""
          '';
        };

        packages = {
          upload-garage = pkgs.writeShellScriptBin "upload-garage" ''
            set -euo pipefail

            # Check required environment variables
            : "''${GARAGE_ENDPOINT:?GARAGE_ENDPOINT must be set}"
            : "''${GARAGE_ACCESS_KEY:?GARAGE_ACCESS_KEY must be set}"
            : "''${GARAGE_SECRET_KEY:?GARAGE_SECRET_KEY must be set}"
            : "''${GARAGE_BUCKET:?GARAGE_BUCKET must be set}"

            echo "📤 Uploading to Garage S3..."

            # Configure AWS CLI for Garage
            export AWS_ACCESS_KEY_ID="$GARAGE_ACCESS_KEY"
            export AWS_SECRET_ACCESS_KEY="$GARAGE_SECRET_KEY"
            export AWS_ENDPOINT_URL="$GARAGE_ENDPOINT"

            # Sync dist directory to bucket
            ${pkgs.awscli2}/bin/aws s3 sync dist/ "s3://$GARAGE_BUCKET/" \
              --delete \
              --acl public-read \
              --cache-control "public, max-age=3600"

            echo "✅ Upload complete"
            echo "📦 Documentation available at: $GARAGE_ENDPOINT/$GARAGE_BUCKET/index.html"
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
