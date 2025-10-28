{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    (pkgs.python3.withPackages (ps: [
      ps.pandas
      ps.numpy
      ps.requests
    ]))
  ];
  idx.extensions = [
    "ms-python.debugpy"
    "ms-python.python"
  ];
  idx.previews = {
    previews = {
      web = {
        command = [
          "npm"
          "run"
          "dev"
          "--"
          "--port"
          "$PORT"
          "--hostname"
          "0.0.0.0"
        ];
        manager = "web";
      };
    };
  };
}