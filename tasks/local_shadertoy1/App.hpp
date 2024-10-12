#pragma once

#include <etna/Window.hpp>
#include <etna/PerFrameCmdMgr.hpp>
#include <etna/ComputePipeline.hpp>
#include <etna/Image.hpp>

#include "wsi/OsWindowingManager.hpp"

#include <etna/Sampler.hpp>

struct AppParameters
{
  glm::vec2 resolution;
  glm::vec2 mouseCoordinates;
  float timedelta;
};

class App
{
public:
  App();
  ~App();

  void run();

private:
  void drawFrame();

  OsWindowingManager windowing;
  std::unique_ptr<OsWindow> osWindow;

  glm::uvec2 resolution;
  bool useVsync;

  std::unique_ptr<etna::Window> vkWindow;
  std::unique_ptr<etna::PerFrameCmdMgr> commandManager;

  std::chrono::system_clock::time_point startTime_;
  etna::ComputePipeline pipeline_;
  AppParameters parameters_;
  etna::Sampler sampler_;
  etna::Image tempImage_;
};
