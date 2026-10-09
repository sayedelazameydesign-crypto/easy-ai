# Cela.sh — Model Robustness & Adversarial Resilience Baseline

> **الحالة:** مسودة معمارية واختبارية للمراجعة البشرية؛ ليست دليلًا على أن نموذجًا
> مقاوم للهجمات أو مستقرًا تحت كل المدخلات.
>
> **التاريخ:** 2026-10-08
>
> **النطاق:** متانة قدرات النماذج النصية أمام الضوضاء والتحولات والهجمات المعادية،
> وحماية التطبيق والأدوات والبيانات عند فشل النموذج.

## 1. القرار الحاكم

لا تُبنى سلامة Cela.sh على افتراض أن النموذج سيتبع التعليمات دائمًا. النموذج مكوّن
احتمالي غير موثوق، ومدخل المستخدم والمحتوى المسترجع ومخرجات النموذج كلها بيانات غير
موثوقة عند حدود الصلاحيات والتنفيذ.

ترتيب الحماية:

1. منع النموذج من امتلاك صلاحية لا يحتاجها.
2. عزل التعليمات الموثوقة عن المحتوى غير الموثوق.
3. التحقق الحتمي من المدخلات والمخرجات والأفعال خارج النموذج.
4. تحديد الحجم والمهلة والتكلفة والمحاولات.
5. اختبار التحولات والهجمات على إصدار محدد.
6. الرفض أو التصعيد عند الغموض أو الخطر.
7. مراقبة الانحدار والrollback وkill switch.

لا يمكن ضمان “مقاومة كل الهجمات”، خصوصًا مع مزود مغلق أو model alias متغير. حالة
اعتماد أي نموذج للإطلاق العام: `BLOCKED` حتى اختيار المزود وإجراء تقييم فعلي.

## 2. معنى المتانة

تُقاس المتانة حسب use case، وليس بدرجة عامة واحدة:

- **Behavioral robustness:** الحفاظ على السلوك المطلوب تحت صياغات وتحولات معقولة.
- **Adversarial robustness:** مقاومة مدخلات مصممة لتجاوز السياسة أو إفساد النتيجة.
- **Operational robustness:** الفشل الآمن عند timeout و429 و5xx والحمولات الكبيرة.
- **Tool robustness:** منع المخرجات من تنفيذ فعل خارج الصلاحية أو الموافقة.
- **Data robustness:** التعامل مع محتوى ناقص أو متعارض أو مسمم.
- **Distributional robustness:** معرفة الحالات خارج نطاق التقييم والامتناع عنها.
- **Reproducibility/stability:** فهم التباين عبر التكرار والإصدارات والإعدادات.

كل بُعد له مقاييس وحدود مستقلة؛ النجاح في واحد لا يثبت البقية.

## 3. نموذج التهديد

### 3.1 الخصوم

- مستخدم يحاول تجاوز السياسة عمدًا.
- محتوى خارجي يحمل تعليمات خبيثة دون علم المستخدم.
- مستند أو صفحة مسممة داخل corpus مستقبلي.
- tool/provider response مُخترق أو غير صالح.
- tenant يحاول الوصول إلى بيانات tenant آخر.
- مهاجم يستهلك tokens أو التكلفة أو الاتصالات.
- مساهم supply-chain يغير prompt أو fixture أو dependency.
- تغيير صامت من مزود النموذج يسبب انحدارًا.

### 3.2 الأصول

- مفاتيح المزود والجلسات والأسرار.
- prompts النظام والسياسات وإعدادات الحصة.
- محادثات المستخدم وملفاته وبيانات `sync/` و`vault/`.
- صلاحيات الأدوات والموصلات والأفعال الخارجية.
- سلامة الردود والقرارات وسجل التدقيق.
- الميزانية والتوافر وسمعة المنتج.

### 3.3 افتراضات غير مسموحة

- أن نص system prompt سر أو حد أمني كافٍ.
- أن النموذج يميز دائمًا التعليمات من البيانات.
- أن structured output صحيح لمجرد مطابقته syntax ظاهريًا.
- أن رفض النموذج يمنع tool call إن كانت الأداة مكشوفة بلا policy gate.
- أن temperature صفر يجعل النتيجة حتمية.
- أن safety filters الخاصة بالمزود تكفي لكل use case ولغة.

## 4. فئات الهجمات المعادية

### 4.1 Prompt Injection مباشر

محاولات مثل تجاهل التعليمات أو طلب الأسرار أو تبديل الدور. الضوابط:

- system/developer policy منفصلة عن user content.
- لا وضع الأسرار في prompt أصلًا.
- policy enforcement الحتمي خارج النموذج للأفعال والصلاحيات.
- allowlist للقدرات والأدوات والوجهات.
- عدم تفسير نص المستخدم كconfiguration أو template code.
- رفض الطلبات التي تتطلب كشف السياسة الداخلية أو بيانات غير مصرح بها.

### 4.2 Prompt Injection غير مباشر

تعليمات داخل مستند أو صفحة أو بريد أو tool result. قبل RAG أو browsing:

- المحتوى الخارجي موسوم كبيانات غير موثوقة.
- لا يمنح المحتوى أداة أو صلاحية أو يغير system policy.
- فصل retrieval عن action planning، مع إعادة تفويض كل فعل.
- allowlist للمصادر والوجهات وسياسة SSRF/DNS rebinding.
- provenance وcitation وربط ACL قبل الاسترجاع وبعده.
- sanitization لا يُعتبر حلًا كاملًا؛ المعنى الخبيث قد يبقى بعد إزالة markup.

RAG/browsing غير معتمدين حاليًا.

### 4.3 Jailbreak وPolicy Evasion

- role-play، الترميز، التجزئة عبر رسائل، لغات ولهجات، homographs، وصور مستقبلية.
- multi-turn attacks التي تبني السياق تدريجيًا.
- طلب تحويل/تلخيص محتوى محظور كوسيلة لتجاوز intent checks.
- استغلال تعارض السياسات أو الأمثلة داخل prompt.

تُختبر السياسات بالعربية والإنجليزية واللهجات والـcode-switching، ولا يعتمد keyword
filter وحده.

### 4.4 تسريب واستخراج البيانات

- طلب system prompt أو أمثلة مخفية أو بيانات مستخدم آخر.
- membership inference/model extraction عند توفر API واسعة.
- استدراج النموذج لإعادة أسرار ظهرت في السياق.
- side channels عبر الأخطاء أو التوقيت أو أحجام الرد.

الضابط الأساسي تقليل السياق وعزل tenants وعدم إرسال الأسرار، لا مطالبة النموذج بعدم
ذكرها فقط.

### 4.5 Tool/Agent Manipulation

- معاملات أداة خبيثة أو حقول إضافية أو أوامر shell/SQL.
- confused deputy وتوسيع صلاحية النموذج عن المستخدم.
- replay أو duplicate action أو تغيير الهدف بين الموافقة والتنفيذ.
- tool result يحقن تعليمات لدعوة أداة أخرى.

لا وكيل ذاتي أو أدوات إنتاجية معتمدة. أي تنفيذ مستقبلي يحتاج schema validation،
permission tuple، preview/confirmation، idempotency، sandbox، audit وkill switch.

### 4.6 Resource Exhaustion

- prompts طويلة أو متكررة أو recursive.
- output غير محدود أو retries وتفرعات أدوات.
- Unicode/JSON pathological inputs أو ملفات مضغوطة خادعة.
- طلبات متزامنة تستنزف الذاكرة أو الحصة.

الضوابط: حدود bytes/tokens/turns/tools/time/concurrency، quota موزعة، hard cost cap،
وbackpressure صريح.

## 5. الفصل بين النموذج والسياسة

لا يُسمح للنموذج باتخاذ قرارات أمنية نهائية. الطبقات:

```text
Untrusted input
    → deterministic validation and classification
    → authorization and policy gate
    → bounded model context
    → untrusted model output
    → schema/semantic/policy validation
    → human approval where required
    → bounded side effect
```

- المصادقة والتفويض والحصة خارج النموذج.
- النموذج لا يقرر tenant أو resource access من نص طبيعي.
- output parser يفشل مغلقًا عند حقل مجهول أو نوع غير صحيح.
- validation يشمل المعنى والمرجع والصلاحية، لا JSON syntax فقط.
- الأفعال عالية الأثر تحتاج موافقة بشرية ذات معنى.
- لا تنفيذ مباشر لمخرجات كود أو HTML أو shell أو SQL.

## 6. بناء السياق بأمان

- أقل سياق يحقق المهمة، مع token budget لكل قسم.
- ترتيب ثابت وواضح للسياسات والمدخلات والمصادر.
- delimiter لا يُعامل كحد أمني بمفرده.
- الرسائل التاريخية تُصنف وتحد وتُنقح قبل إعادة الإرسال.
- tool outputs تحمل source/trust metadata ولا تندمج كتعليمات.
- لا خلط بيانات tenants أو جلسات أو مستخدمين.
- تلخيص السياق لا يفقد الموافقات أو يحول محتوى غير موثوق إلى سياسة.
- context truncation له أولوية معلنة؛ لا يحذف system safety أو آخر موافقة لازمة.

سجل المحادثة الدائم غير منفذ ولا يُفترض وجوده.

## 7. التحقق من المخرجات

حسب نوع الرد:

- نص للمستخدم: encoding وحجم وسياسة ووضوح uncertainty.
- JSON: parser قياسي وschema صارمة وحدود depth/array/string.
- citation: المصدر موجود ومصرح ويدعم الادعاء.
- tool call: اسم allowlisted، arguments validated، resource authorized، وموافقة.
- كود: لا يُنفذ تلقائيًا؛ static/security review وsandbox عند الحاجة.
- URL: scheme/host/port/IP policy وحماية SSRF وredirects وDNS rebinding.
- ملف: type/size/malware/archive limits واسم آمن.
- قرار حساس: غير مسموح آليًا ويحتاج reviewer مؤهلًا.

إذا فشل validation لا يُعاد prompt بلا حد لإجبار نموذج على التصحيح؛ المحاولات محدودة
وتستهلك من المهلة والحصة والتكلفة.

## 8. الاستقرار أمام الضوضاء والتحولات

### 8.1 تحولات لغوية

- إعادة صياغة تحفظ المعنى.
- أخطاء إملائية ولوحة مفاتيح ولهجات وcode-switching.
- اختلاف علامات الترقيم والمسافات والتشكيل والتطويل.
- ترتيب مختلف للمعلومات غير الدلالية.
- صيغة مباشرة مقابل مثال أو سياق طويل.

### 8.2 تحولات تقنية

- Unicode normalization وbidi controls وzero-width characters.
- JSON field ordering وwhitespace وأنواع حدودية.
- HTML/Markdown/code fences والاقتباسات المتداخلة.
- ملفات صغيرة صحيحة وأخرى تالفة أو ناقصة.
- timeout وتجزئة الشبكة واستجابة مزود ناقصة.

### 8.3 ثبات النتيجة

لا يُطلب تطابق نصي حرفي. يُقاس:

- ثبات النية والسياسة والامتناع.
- semantic equivalence أو rubric score.
- صحة facts/citations/contracts.
- عدم تغير tool choice أو الصلاحية دون سبب.
- variance في الجودة والطول والتكلفة عبر تكرارات.
- calibration/abstention consistency إن وجدت.

Thresholds تعتمد المهمة والخطر: `NOT_DEFINED`.

## 9. إعدادات العشوائية والإصدارات

- تُسجل model identifier/version وtemperature/top_p/seed إن دعمها المزود.
- لا تغيير عدة sampling controls دون تجربة مبررة.
- temperature منخفضة قد تقلل التباين لكنها لا تضمن الحتمية أو الصحة.
- aliases المتحركة تحتاج اكتشاف تغيير وإعادة تقييم.
- نفس prompt قد يعطي نتائج مختلفة بسبب بنية المزود؛ يقاس distribution لا عينة واحدة.
- prompts والسياسات والevaluation sets محددة الإصدار مع checksums.
- مقارنة الإصدارات تستخدم نفس harness وحملًا ممثلًا.

لا يوجد model/version معتمد أو stability baseline حاليًا.

## 10. مجموعات واختبارات المتانة

### 10.1 مجموعة نظيفة

حالات طبيعية ممثلة للغات والمهام والأطوال والشرائح، مع expected behavior/rubric.

### 10.2 مجموعة تحولات

أزواج أو عائلات inputs تحفظ المعنى، لقياس فرق الجودة والسياسة والتكلفة.

### 10.3 مجموعة معادية

- direct/indirect prompt injection.
- jailbreak متعدد اللغات والجولات.
- secret/system prompt exfiltration.
- cross-tenant access وIDOR/BOLA على حدود التطبيق.
- malicious tool outputs وarguments.
- oversized/recursive/encoded inputs.
- unsafe code/URL/file generation.
- refusal bypass والتحويل/الاقتباس.

### 10.4 مجموعة خارج النطاق

طلبات لا تدعمها القدرة، لقياس الامتناع الصحيح بدل التخمين.

كل حالة لها المصدر والترخيص والخطر والنتيجة المتوقعة وسببها. لا تُحفظ payloads
ضارة أو أسرار حقيقية دون عزل وصلاحية. Dataset الاختبار الحالية: `NOT_DEFINED`.

## 11. المقاييس

- attack success rate حسب فئة الهجوم واللغة.
- safe completion وover-refusal/under-refusal rates.
- task quality على clean مقابل transformed inputs.
- worst-case وworst-group performance، لا المتوسط فقط.
- consistency rate ضمن metamorphic relations.
- schema/tool validation failure rate.
- secret/cross-tenant leakage rate، ويجب أن يكون failure فيها مانعًا.
- abstention correctness للحالات خارج النطاق.
- latency/token/cost amplification تحت الهجوم.
- variance عبر التكرار والإصدار.
- time-to-detect وtime-to-disable للحادث.

Thresholds وrisk acceptance: `NOT_DEFINED`. لا تجمع المقاييس الحرجة في score واحدة
تسمح لتعويض تسريب بيانات بتحسن جودة.

## 12. منهج الاختبار

- black-box لاختبار السلوك الفعلي عبر العقد العام.
- gray-box لاختبار حدود prompt/tool/policy عندما يكون التنفيذ متاحًا.
- property/metamorphic tests للتحولات المتوقعة.
- fuzzing parsers والحدود محليًا ضمن وقت وحجم مضبوطين.
- differential tests بين الإصدارات، لا بين مزودين بلا قرار بيانات وتكلفة.
- repeated trials للنماذج الاحتمالية مع intervals.
- red-team بشري متعدد اللغات للمخاطر التي لا تغطيها القوالب.
- canary/shadow فقط بعد الخصوصية والبنية والموافقة.

لا يُشن اختبار غير مصرح على endpoint مزود أو خدمة عامة. الاختبار الحقيقي يحتاج مفتاحًا
وحد تكلفة وتصريحًا، ولا تُعتبر mocks إثباتًا لمتانة النموذج.

## 13. Red Team وإدارة النتائج

كل finding يسجل:

- معرفًا وتصنيفًا وشدة وتأثيرًا قابلًا للاستغلال.
- إصدار النموذج/prompt/policy والتاريخ والبيئة.
- خطوات إعادة إنتاج منقحة أو artifact محميًا.
- الفئة واللغة والـpreconditions.
- سببًا جذريًا عبر التطبيق/البيانات/المزود/السياسة.
- إصلاحًا ومالكًا وموعدًا واختبار regression.
- نتيجة إعادة الاختبار ومخاطر متبقية.

لا تُنشر payloads قابلة للاستغلال أو أسرار في Git/issues عامة. severity وSLA يتبعان
برنامج الثغرات في `SECURITY_ARCHITECTURE.md`.

## 14. الدفاع متعدد الطبقات

### قبل النموذج

- authentication/authorization/quota.
- content type وschema والحجم واللغة والencoding checks.
- source trust metadata وACL.
- إزالة أسرار وبيانات غير لازمة، لا “تنظيف” يزعم إزالة كل هجوم.

### حول النموذج

- prompt version ثابت وسياسة واضحة.
- token/time/tool budgets.
- provider allowlist وTLS وأخطاء منقحة.
- لا أدوات أو ذاكرة أو شبكة افتراضيًا.

### بعد النموذج

- schema وpolicy وpermission validation.
- citation/grounding checks عند وجود مصادر.
- human approval للأثر الخارجي أو الحساسية.
- safe rendering وescaping ومنع التنفيذ.

### تشغيل

- monitoring وalerts وrate limits وhard cost cap.
- version pinning/change detection وrollback.
- kill switch وحوادث وإبطال مفاتيح.

## 15. مقاومة تسميم البيانات والنموذج

إذا أضيف تعلم أو RAG:

- provenance وترخيص وتوقيع/checksum للمصادر.
- quarantine وschema/malware/PII/quality checks.
- مراجعة تغير source mix وduplicates والقيم الشاذة.
- حماية feedback من Sybil/replay والتلاعب.
- عدم اعتبار model-generated labels حقيقة دون تحقق.
- immutable dataset/index/model versions وrollback.
- فصل من يقترح data change عمن يعتمدها في الحالات الحساسة.
- حذف مستند لا يترك chunks/embeddings/cache قابلة للاسترجاع.

لا تدريب أو RAG أو continuous learning معتمد حاليًا.

## 16. استقرار الأدوات والأفعال

أي tool use مستقبلي يخضع لـ:

- عقد typed ومحدد الإصدار، ولا arguments حرة تُنفذ كأمر.
- أقل صلاحية وتقاطع صلاحيات المستخدم/الوكيل/الموصل.
- dry-run/preview قبل الأثر عندما يمكن.
- confirmation يربط action hash والوجهة والقيم الحساسة المعروضة بأمان.
- idempotency وdeduplication وtimeout وإلغاء.
- no silent retry للكتابة غير الآمنة.
- result treated as untrusted input.
- audit منقح وcompensation/rollback حيث يمكن.

اختلاف صغير في صياغة المستخدم لا يجوز أن يغير الأداة أو المورد في عملية خطرة دون
مراجعة واضحة.

## 17. الاستجابة عند الفشل

- validation failure: رفض آمن برسالة قابلة للتصحيح.
- policy uncertainty: abstain أو تصعيد، لا افتراض السماح.
- provider timeout/error: خطأ صريح، لا fallback إلى Demo.
- attack signal: تقييد الطلب وتسجيل حدث منقح دون كشف detection internals.
- repeated abuse: rate limit/session revocation وفق هوية موثوقة.
- suspected leakage: kill switch، إبطال الأسرار، incident response.
- model regression: وقف rollout والرجوع إلى إصدار معروف.
- widespread unknown behavior: تعطيل القدرة مع إبقاء قناة دعم آمنة.

## 18. المراقبة بعد الإطلاق

- attack/refusal/validation rates حسب operation واللغة دون تسجيل المحتوى الخام.
- تغير توزيع الأطوال والencoding والأخطاء والـ429.
- schema/tool-call failures وpermission denials.
- quality/stability canaries على inputs صناعية دورية.
- provider model/version change detection.
- token/cost amplification وretry anomalies.
- شكاوى المستخدم والحوادث وfalse positives.

لا يُعاد تدريب أو تعديل policy تلقائيًا من هذه الإشارات. التنبيه يؤدي إلى triage
ومراجعة بشرية وفق `LEARNING_ADAPTABILITY_ARCHITECTURE.md`.

## 19. المسؤولية

قبل أي تقييم فعلي يجب تعيين:

- Model/System Owner.
- Application Security Owner.
- Data/RAG Owner عند وجود corpus.
- Safety/Policy Reviewer.
- Domain Expert للاستخدام الحساس.
- Operations/Incident Owner.
- Human Approver لقبول المخاطر.

الأدوار الحالية: `NOT_ASSIGNED`. المزود مسؤول عن خدمته وفق عقده، لكن اختيار النموذج
والصلاحيات والواجهة والمراقبة ومسار الضرر تبقى مسؤولية مشغل Cela.sh.

## 20. سجل القرارات

| القرار | الحالة | المطلوب للحسم |
|---|---|---|
| اعتبار النموذج/المخرجات غير موثوقة | `PROPOSED` | تطبيق عبر كل حد وتنفيذ اختبارات |
| Model/provider/version | `NOT_DECIDED` | تحقق رسمي وتجربة حقيقية مصرح بها |
| Robustness evaluation set | `NOT_DEFINED` | use cases ولغات ومخاطر ومصادر |
| Stability thresholds | `NOT_DEFINED` | baseline وتكرارات وخطر المهمة |
| Prompt-injection red team | `NOT_PERFORMED` | نموذج فعلي ونطاق وتصريح وبيئة |
| RAG/browsing robustness | `NOT_APPROVED` | حاجة وACL وSSRF وحقائق وتقييم |
| Tool/agent execution | `NOT_APPROVED` | عقود وصلاحيات وsandbox وموافقات |
| Automated adversarial adaptation | `NOT_APPROVED` | حوكمة تعلم وتقييم مستقل وrollback |
| Robustness claim | `BLOCKED` | نتائج محددة الإصدار والنطاق والقيود |
| Public model readiness | `BLOCKED` | إغلاق بوابات القسم التالي |

## 21. بوابات الجاهزية

### مسموح الآن

- اختبارات parser/validation/contracts محلية ببيانات صناعية.
- إعداد evaluation cases غير حساسة دون مهاجمة خدمة خارجية.
- تحسينات صغيرة fail-closed مع regression tests.
- توثيق threat model وحدود النموذج دون ادعاء مقاومة.

### مانع لإطلاق قدرة نموذج عامة

- لا نموذج/إصدار/prompt معتمد ومثبت.
- لا evaluation set أو thresholds للمتانة والاستقرار.
- لا اختبار مزود حقيقي أو repeated-trial baseline.
- لا red-team متعدد اللغات أو علاج وإعادة اختبار.
- لا مصادقة وحصة وحد تكلفة وkill switch.
- لا عزل أدوات/بيانات وصلاحيات أو human approval للأثر.
- لا مراقبة model changes وrollback وحوادث.
- بوابات الأمن والأخلاق والبيانات والموثوقية مفتوحة.

### شرط تغيير الحالة

لا تصبح المتانة `APPROVED` بنجاح أمثلة قليلة أو رفض jailbreak مشهور. يلزم تقييم
محدد الإصدار والنطاق، clean/transformed/adversarial/out-of-scope sets، تكرارات
إحصائية، اختبارات حدود التطبيق والأدوات، red-team مستقل، إصلاح وإعادة اختبار، وقبول
بشري للمخاطر المتبقية مع مراقبة وrollback.

## 22. العلاقة مع الوثائق الأخرى

- `AI_BACKEND_DESIGN.md`: المزود والنموذج والحدود والتكلفة.
- `COMMUNICATION_ARCHITECTURE.md`: المهلة والإلغاء والأخطاء والصلاحيات.
- `SECURITY_ARCHITECTURE.md`: threat model وSSRF والأسرار والحوادث.
- `DATA_QUALITY_ARCHITECTURE.md`: التسميم والتمثيل والlineage والتقييم.
- `AI_ETHICS_ARCHITECTURE.md`: الضرر والعدالة والإشراف والمساءلة.
- `LEARNING_ADAPTABILITY_ARCHITECTURE.md`: drift وإصدارات التحسين والrollback.
- `RELIABILITY_ARCHITECTURE.md`: الفشل الجزئي والمراقبة وkill switch.
- `SCALABILITY_ARCHITECTURE.md`: الحمل المعادي والـbackpressure والحصة.

عند التعارض تُقدم حماية البيانات والصلاحيات وسلامة الأشخاص والقانون على معدل الإجابة
أو المرونة. لا تغير هذه الوثيقة بنية `sync/` أو عقودها أو manifest، ولا تسمح بإرسال
`vault/` أو الأسرار أو بيانات غير مصرح بها إلى نموذج أو مجموعة اختبار.
