/*
 * 中国いえるかな？
 *
 * ゲーム本体
 */


/* =========================
   地図データ
========================= */

const GEOJSON_URL =
  "https://raw.githubusercontent.com/BarbarossaWang/cn-atlas/main/geojson/provinces.json";


/* =========================
   DOM
========================= */

const mapSvg =
  d3.select("#china-map");

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


/* =========================
   ゲーム状態
========================= */

const foundRegions =
  new Set();

let regionPaths =
  new Map();

let mapLoaded =
  false;


/* =========================
   フィードバック
========================= */

function showFeedback(
  message,
  type = ""
) {

  feedback.textContent =
    message;

  feedback.className =
    `feedback ${type}`.trim();

}


/* =========================
   進捗更新
========================= */

function updateProgress() {

  const count =
    foundRegions.size;

  const percent =
    Math.round(
      count /
      TOTAL_REGIONS *
      100
    );


  score.textContent =
    count;

  foundCount.textContent =
    count;

  progressPercent.textContent =
    `${percent}%`;

  progressBar.style.width =
    `${percent}%`;


  if (
    count === TOTAL_REGIONS
  ) {

    showFeedback(
      "全地域コンプリート！中国地図が完成しました。",
      "correct"
    );

  }

}


/* =========================
   正解リスト
========================= */

function addFoundRegion(region) {

  const empty =
    foundList.querySelector(".empty");

  if (empty) {

    foundList.innerHTML =
      "";

  }


  const item =
    document.createElement("span");

  item.className =
    "found-item";

  item.textContent =
    region.name;

  foundList.appendChild(item);

}


/* =========================
   地図を塗る
========================= */

function paintRegion(
  regionId
) {

  const paths =
    regionPaths.get(regionId);

  if (!paths) {

    console.warn(
      "地図上に地域がありません:",
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


  setTimeout(() => {

    paths.classed(
      "just-found",
      false
    );

  }, 600);

}


/* =========================
   回答処理
========================= */

function checkAnswer(value) {

  const normalized =
    normalizeAnswer(value);


  if (!normalized) {

    showFeedback(
      "地域名を入力してください。",
      "error"
    );

    return;

  }


  const regionId =
    ANSWER_MAP.get(
      normalized
    );


  /*
   * 登録されていない答え
   */

  if (!regionId) {

    showFeedback(
      "その地域は登録されていません。",
      "error"
    );

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
        item =>
          item.id === regionId
      );


    showFeedback(
      `${region.name}は、すでに答えています。`,
      "error"
    );

    answerInput.select();

    return;

  }


  /*
   * 正解
   */

  const region =
    CHINA_REGIONS.find(
      item =>
        item.id === regionId
    );


  foundRegions.add(
    regionId
  );


  paintRegion(
    regionId
  );


  addFoundRegion(
    region
  );


  updateProgress();


  if (
    foundRegions.size <
    TOTAL_REGIONS
  ) {

    showFeedback(
      `${region.name} 正解！`,
      "correct"
    );

  }


  answerInput.value =
    "";

  answerInput.focus();

}


/* =========================
   リセット
========================= */

function resetGame() {

  foundRegions.clear();


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
        );

    }
  );


  foundList.innerHTML =
    `
      <span class="empty">
        まだありません
      </span>
    `;


  answerInput.value =
    "";

  updateProgress();


  showFeedback(
    "思いついた地域から入力してください。"
  );


  answerInput.focus();

}


/* =========================
   GeoJSONの地域名を取得
========================= */

function getRegionName(
  feature
) {

  const properties =
    feature.properties || {};


  return (
    properties["地名"] ||
    properties.name ||
    properties.NAME ||
    properties.Name ||
    ""
  ).trim();

}


/* =========================
   地図生成
========================= */

function createMap(
  geojson
) {

  const width =
    900;

  const height =
    650;


  const projection =
    d3.geoMercator()
      .fitExtent(
        [
          [25, 25],
          [width - 25, height - 25]
        ],
        geojson
      );


  const path =
    d3.geoPath(
      projection
    );


  const features =
    geojson.features;


  const paths =
    mapSvg
      .selectAll(
        "path.region"
      )
      .data(
        features
      )
      .join("path")
      .attr(
        "class",
        "region"
      )
      .attr(
        "d",
        path
      )
      .attr(
        "data-name",
        getRegionName
      );


  /*
   * 地域IDとSVGパスを紐付ける
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


  mapLoaded =
    true;


  statusText.textContent =
    "地図の準備完了";


  answerInput.disabled =
    false;

  submitButton.disabled =
    false;

  answerInput.focus();


  /*
   * デバッグ用
   */

  const missing =
    CHINA_REGIONS
      .filter(
        region =>
          !regionPaths.has(
            region.id
          )
      );


  if (
    missing.length
  ) {

    console.warn(
      "地図に紐付かなかった地域:",
      missing.map(
        r => r.mapName
      )
    );

  }

}


/* =========================
   地図読み込み
========================= */

async function loadMap() {

  try {

    statusText.textContent =
      "地図データを読み込んでいます…";


    answerInput.disabled =
      true;

    submitButton.disabled =
      true;


    const response =
      await fetch(
        GEOJSON_URL
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const geojson =
      await response.json();


    createMap(
      geojson
    );


  } catch (error) {

    console.error(
      error
    );


    statusText.textContent =
      "地図データの読み込みに失敗しました";


    showFeedback(
      "地図データを読み込めませんでした。",
      "error"
    );

  }

}


/* =========================
   イベント
========================= */

answerForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();


    if (
      !mapLoaded
    ) {

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


/* =========================
   起動
========================= */

updateProgress();

loadMap();