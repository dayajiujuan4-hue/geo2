/* =========================================================
   中国いえるかな？
   GAME ENGINE
========================================================= */


/* =========================================================
   設定
========================================================= */

// cn-atlas の省級行政区GeoJSON
const GEOJSON_URL =
  "https://cdn.jsdelivr.net/npm/cn-atlas@0.1.2/provinces.json";


/* =========================================================
   DOM
========================================================= */

const svg = d3.select("#china-map");

const answerForm =
  document.querySelector("#answer-form");

const answerInput =
  document.querySelector("#answer");

const submitButton =
  document.querySelector("#answer-form button");

const resetButton =
  document.querySelector("#reset-button");

const feedback =
  document.querySelector("#feedback");

const score =
  document.querySelector("#score");

const foundCount =
  document.querySelector("#found-count");

const progressPercent =
  document.querySelector("#progress-percent");

const progressBar =
  document.querySelector("#progress-bar");

const foundList =
  document.querySelector("#found-list");

const statusText =
  document.querySelector("#status-text");


/* =========================================================
   ゲーム状態
========================================================= */

const foundRegions = new Set();

let regionPaths = new Map();

let mapLoaded = false;


/* =========================================================
   SVGサイズ
========================================================= */

const WIDTH = 900;
const HEIGHT = 650;


/* =========================================================
   フィードバック
========================================================= */

function showFeedback(message, type = "") {

  feedback.textContent = message;

  feedback.className =
    `feedback ${type}`.trim();

}


/* =========================================================
   進捗更新
========================================================= */

function updateProgress() {

  const current =
    foundRegions.size;

  const total =
    TOTAL_REGIONS;

  const percent =
    Math.round(
      current / total * 100
    );


  score.textContent =
    current;

  foundCount.textContent =
    current;

  progressPercent.textContent =
    `${percent}%`;

  progressBar.style.width =
    `${percent}%`;


  /*
   * 100%到達
   */

  if (current === total) {

    completeGame();

  }

}


/* =========================================================
   地域名取得
========================================================= */

function getRegionName(feature) {

  const p =
    feature.properties || {};


  /*
   * cn-atlas
   */

  if (
    p.province &&
    p.province.地名
  ) {

    return p.province.地名;

  }


  /*
   * 念のため他形式にも対応
   */

  return (
    p.地名 ||
    p.fullname ||
    p.name ||
    p.NAME ||
    ""
  ).trim();

}


/* =========================================================
   地図生成
========================================================= */

function drawMap(geojson) {

  /*
   * 古い地図を消す
   */

  svg.selectAll("*").remove();


  /*
   * 背景
   */

  svg.append("rect")
    .attr("class", "map-background")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", WIDTH)
    .attr("height", HEIGHT);


  /*
   * 投影
   */

  const projection =
    d3.geoMercator()
      .fitExtent(
        [
          [35, 30],
          [WIDTH - 35, HEIGHT - 30]
        ],
        geojson
      );


  const path =
    d3.geoPath()
      .projection(projection);


  /*
   * 地図レイヤー
   */

  const mapLayer =
    svg.append("g")
      .attr("class", "map-layer");


  /*
   * 地域
   */

  const paths =
    mapLayer
      .selectAll("path.region")
      .data(
        geojson.features
      )
      .join("path")
      .attr("class", "region")
      .attr("d", path)
      .attr(
        "data-name",
        getRegionName
      );


  /*
   * 地域とゲームデータを紐付け
   */

  regionPaths =
    new Map();


  for (
    const region
    of CHINA_REGIONS
  ) {

    const matching =
      paths.filter(
        function(feature) {

          return (
            getRegionName(feature) ===
            region.mapName
          );

        }
      );


    if (
      !matching.empty()
    ) {

      regionPaths.set(
        region.id,
        matching
      );

    }

  }


  /*
   * 国境ラインを少し強調
   */

  svg.append("g")
    .attr("class", "map-outline")
    .append("path")
    .datum(geojson)
    .attr("d", path);


  /*
   * 読み込み完了
   */

  mapLoaded = true;

  statusText.textContent =
    "READY — 地図の準備完了";

  statusText.parentElement
    .classList.add("ready");


  answerInput.disabled = false;

  submitButton.disabled = false;

  answerInput.focus();


  /*
   * デバッグ
   */

  const missing =
    CHINA_REGIONS.filter(
      region =>
        !regionPaths.has(
          region.id
        )
    );


  if (missing.length > 0) {

    console.warn(
      "地図に紐付かなかった地域:",
      missing.map(
        r => r.mapName
      )
    );

  }


  console.log(
    `地図読み込み完了: ${regionPaths.size}/${TOTAL_REGIONS}`
  );

}


/* =========================================================
   地図読み込み
========================================================= */

async function loadMap() {

  try {

    statusText.textContent =
      "LOADING MAP DATA...";


    answerInput.disabled =
      true;

    submitButton.disabled =
      true;


    const response =
      await fetch(
        GEOJSON_URL
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const geojson =
      await response.json();


    if (
      !geojson.features ||
      !Array.isArray(
        geojson.features
      )
    ) {

      throw new Error(
        "GeoJSON形式が正しくありません"
      );

    }


    drawMap(
      geojson
    );


  } catch (error) {

    console.error(
      "MAP LOAD ERROR:",
      error
    );


    statusText.textContent =
      "MAP LOAD ERROR";


    showFeedback(
      "地図を読み込めませんでした。ブラウザのコンソールを確認してください。",
      "error"
    );

  }

}


/* =========================================================
   地域を塗る
========================================================= */

function paintRegion(regionId) {

  const paths =
    regionPaths.get(
      regionId
    );


  if (!paths) {

    console.warn(
      "地域パスが見つかりません:",
      regionId
    );

    return;

  }


  paths
    .classed(
      "found",
      true
    )
    .classed(
      "just-found",
      true
    );


  /*
   * 発光アニメーション
   */

  setTimeout(() => {

    paths.classed(
      "just-found",
      false
    );

  }, 900);

}


/* =========================================================
   正解リスト追加
========================================================= */

function addFoundRegion(region) {

  const empty =
    foundList.querySelector(
      ".empty"
    );


  if (empty) {

    foundList.innerHTML =
      "";

  }


  const item =
    document.createElement(
      "span"
    );


  item.className =
    "found-item";


  item.textContent =
    region.name;


  foundList.prepend(
    item
  );

}


/* =========================================================
   正解演出
========================================================= */

function correctEffect(region) {

  /*
   * 画面を少しだけ光らせる
   */

  document.body.classList.add(
    "correct-flash"
  );


  setTimeout(() => {

    document.body.classList.remove(
      "correct-flash"
    );

  }, 180);


  showFeedback(
    `${region.name} — 正解！`,
    "correct"
  );

}


/* =========================================================
   回答判定
========================================================= */

function checkAnswer(value) {

  const normalized =
    normalizeAnswer(
      value
    );


  /*
   * 空入力
   */

  if (!normalized) {

    showFeedback(
      "地域名を入力してください。",
      "error"
    );

    return;

  }


  /*
   * 答え検索
   */

  const regionId =
    ANSWER_MAP.get(
      normalized
    );


  /*
   * 不正解
   */

  if (!regionId) {

    showFeedback(
      "その地域は登録されていません。",
      "error"
    );


    answerInput.classList.add(
      "input-error"
    );


    setTimeout(() => {

      answerInput.classList.remove(
        "input-error"
      );

    }, 350);


    answerInput.select();

    return;

  }


  /*
   * すでに回答済み
   */

  if (
    foundRegions.has(
      regionId
    )
  ) {

    const region =
      CHINA_REGIONS.find(
        r =>
          r.id === regionId
      );


    showFeedback(
      `${region.name}は、すでに答えています。`,
      "error"
    );

    answerInput.select();

    return;

  }


  /*
   * 地域情報
   */

  const region =
    CHINA_REGIONS.find(
      r =>
        r.id === regionId
    );


  /*
   * 正解登録
   */

  foundRegions.add(
    regionId
  );


  /*
   * 地図着色
   */

  paintRegion(
    regionId
  );


  /*
   * リスト追加
   */

  addFoundRegion(
    region
  );


  /*
   * 正解演出
   */

  correctEffect(
    region
  );


  /*
   * 進捗
   */

  updateProgress();


  /*
   * 入力欄
   */

  answerInput.value =
    "";

  answerInput.focus();

}


/* =========================================================
   コンプリート
========================================================= */

function completeGame() {

  showFeedback(
    "COMPLETE — 中国地図が完成しました！",
    "correct"
  );


  document
    .querySelector(".game")
    .classList.add(
      "game-complete"
    );


  /*
   * 地図全体を一度光らせる
   */

  svg
    .selectAll(".region")
    .classed(
      "complete-glow",
      true
    );


  setTimeout(() => {

    svg
      .selectAll(".region")
      .classed(
        "complete-glow",
        false
      );

  }, 1800);

}


/* =========================================================
   リセット
========================================================= */

function resetGame() {

  foundRegions.clear();


  /*
   * 地図を灰色に戻す
   */

  regionPaths.forEach(
    paths => {

      paths
        .classed(
          "found",
          false
        )
        .classed(
          "just-found",
          false
        )
        .classed(
          "complete-glow",
          false
        );

    }
  );


  /*
   * リスト
   */

  foundList.innerHTML =
    `
      <span class="empty">
        まだありません
      </span>
    `;


  /*
   * 完成状態解除
   */

  document
    .querySelector(".game")
    .classList.remove(
      "game-complete"
    );


  /*
   * 入力
   */

  answerInput.value =
    "";


  /*
   * 進捗
   */

  updateProgress();


  showFeedback(
    "思いついた地域から入力してください。"
  );


  answerInput.focus();

}


/* =========================================================
   イベント
========================================================= */

answerForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();


    if (!mapLoaded) {

      return;

    }


    checkAnswer(
      answerInput.value
    );

  }
);


resetButton.addEventListener(
  "click",
  resetGame
);


/* =========================================================
   起動
========================================================= */

updateProgress();

loadMap();
