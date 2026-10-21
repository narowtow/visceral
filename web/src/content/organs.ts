import type { EducationSourceId } from './sources'

export interface OrganEducation {
  summary: string
  structures: string[]
  burden: string
  fact: string
  sources: EducationSourceId[]
}
const entry = (summary: string, structures: string[], burden: string, fact: string): OrganEducation =>
  ({ summary, structures, burden, fact, sources: ['openstax', 'mapping'] })

export const organContent: Record<string, OrganEducation> = {
  brain: entry(
    'The brain processes information and coordinates movement, thought, emotion and sensation. It also helps regulate automatic functions such as breathing and body temperature.',
    ['Cerebrum: thought, sensation and voluntary movement', 'Cerebellum: coordination and balance', 'Brainstem: connections and automatic functions', 'Blood vessels supplying brain tissue'],
    'This group counts stroke, neurological conditions, brain and nervous system cancers, meningitis and encephalitis. Mental health and substance use conditions are counted separately.',
    'Your brain continues to process information while you sleep.'),
  eyes: entry(
    'The eyes detect light and turn it into signals that the brain can interpret as vision. Muscles and transparent tissues help focus light onto the retina.',
    ['Cornea: clear front surface', 'Lens: focuses light', 'Retina: light-sensitive tissue', 'Optic nerve: carries visual signals'],
    'Glaucoma, cataracts, uncorrected refractive errors, macular degeneration and other vision loss map here. The grouping describes these causes, rather than every condition that can affect eyesight.',
    'The pupil is an opening in the iris, not a solid black structure.'),
  ears: entry(
    'The ears detect sound and help maintain balance. The outer and middle ear carry sound inward, while the inner ear converts movement into nerve signals.',
    ['Outer ear and ear canal', 'Eardrum and middle-ear bones', 'Cochlea: hearing', 'Vestibular structures: balance'],
    'Otitis media and other hearing loss map here. The visible model shows the external ears; the counted conditions also involve internal structures.',
    'The smallest bones in the body are in the middle ear.'),
  thyroid: entry(
    'The thyroid releases hormones that help regulate how the body uses energy. These hormones also support growth and development.',
    ['Thyroid lobes beside the airway', 'Isthmus linking the lobes', 'Follicles that make and store thyroid hormone'],
    'Only thyroid cancer is assigned directly to this group in the current mapping. Broader endocrine conditions and iodine deficiency are counted in other groups, so this is not a total for all thyroid-related illness.',
    'Thyroid hormones contain iodine.'),
  lungs: entry(
    'The lungs exchange oxygen and carbon dioxide between air and blood. The airways carry air to the small air sacs where this exchange happens.',
    ['Trachea and main bronchi', 'Smaller bronchi and bronchioles', 'Alveoli: air sacs for gas exchange', 'Pulmonary capillaries beside the air sacs'],
    'Respiratory diseases and infections, tuberculosis, COVID-19, lung and airway cancers, and larynx cancer map here. All tuberculosis is assigned here because its anatomical sites are not separated in these data.',
    'The trachea branches into airways that become progressively smaller inside the lungs.'),
  heart: entry(
    'The heart pumps blood through the lungs and the rest of the body. Its valves guide blood forward as the heart muscle contracts and relaxes.',
    ['Atria: receiving chambers', 'Ventricles: pumping chambers', 'Valves directing blood flow', 'Coronary vessels supplying heart muscle'],
    'Ischaemic, hypertensive and rheumatic heart disease map here, along with cardiomyopathy, myocarditis and endocarditis. Stroke maps to brain; other circulatory diseases remain in Other & unallocated.',
    'The electrical signals that set the heartbeat can start within the heart itself.'),
  esophagus: entry(
    'The esophagus carries swallowed food and liquid from the throat to the stomach. Coordinated muscle contractions move its contents along.',
    ['Muscular wall', 'Inner lining', 'Upper and lower esophageal sphincters'],
    'Esophagus cancer is assigned here. This group does not represent every esophageal condition; broader digestive residuals remain elsewhere.',
    'Food travels through the esophagus by muscle contractions, not gravity alone.'),
  stomach: entry(
    'The stomach temporarily stores food and mixes it with acid and digestive enzymes. It gradually releases the mixture into the small intestine.',
    ['Fundus and body: storage and mixing', 'Gastric lining and glands', 'Muscular wall', 'Pylorus: outlet to the intestine'],
    'Stomach cancer, peptic ulcer disease, and gastritis and duodenitis map here. This simplified grouping includes some conditions of the neighboring duodenum.',
    'A mucus barrier helps protect the stomach lining from its own acidic contents.'),
  liver: entry(
    'The liver processes absorbed nutrients and many substances carried in blood. It makes bile and proteins needed for functions such as blood clotting.',
    ['Liver lobes', 'Hepatocytes: working liver cells', 'Portal vein and hepatic artery', 'Small bile channels'],
    'Hepatitis, liver cancer and cirrhosis map here. Diseases of the gallbladder and bile ducts have their own group.',
    'The liver makes bile; the gallbladder stores and concentrates it.'),
  gallbladder: entry(
    'The gallbladder stores and concentrates bile made by the liver. Bile ducts carry bile into the small intestine, where it helps the digestion and absorption of fats.',
    ['Gallbladder sac', 'Cystic duct', 'Hepatic ducts', 'Common bile duct'],
    'Gallbladder and biliary diseases, and gallbladder and biliary tract cancer, map here. The group includes the ducts as well as the gallbladder itself.',
    'Bile helps break fat into small droplets so digestive enzymes can work on it.'),
  pancreas: entry(
    'The pancreas produces enzymes that help digest food in the small intestine. It also releases hormones, including insulin and glucagon, that help regulate blood glucose.',
    ['Head, body and tail', 'Acinar cells making digestive enzymes', 'Pancreatic ducts', 'Islets making hormones'],
    'Pancreatic cancer and pancreatitis map here. Diabetes is kept in Diabetes & metabolic because its effects extend across several organs.',
    'The pancreas sends digestive secretions into a duct but releases its hormones into blood.'),
  small_intestine: entry(
    'The small intestine digests food and absorbs most nutrients. Its folded lining provides a large surface for moving digested nutrients into blood and lymph.',
    ['Duodenum: receives digestive secretions', 'Jejunum: nutrient absorption', 'Ileum: final small-intestine segment', 'Villi and microvilli on the lining'],
    'Diarrhoeal diseases and intestinal nematode infections map here. This is a simplified attribution of intestinal disease families, not a claim that each infection affects only this site.',
    'Tiny projections called microvilli cover the surfaces of many nutrient-absorbing cells.'),
  colon_rectum: entry(
    'The colon absorbs water and electrolytes from digestive contents and helps form stool. The rectum stores stool before it leaves the body.',
    ['Cecum', 'Ascending, transverse and descending colon', 'Sigmoid colon', 'Rectum'],
    'Colon and rectum cancers and inflammatory bowel disease map here. Inflammatory bowel disease can also affect the small intestine; it is assigned once to avoid double-counting.',
    'The colon contains microbes that can break down some substances human digestive enzymes cannot.'),
  kidneys: entry(
    'The kidneys filter blood and adjust how much water and dissolved material leave as urine. They also help regulate blood pressure, acid balance and red blood cell production.',
    ['Nephrons: filtering units', 'Glomeruli: capillary filters', 'Renal tubules', 'Collecting system and renal pelvis'],
    'Kidney diseases and kidney cancer map here. Kidney damage counted under an underlying cause such as diabetes is not added again to this group.',
    'The kidneys release a hormone that signals bone marrow to make red blood cells.'),
  bladder: entry(
    'The bladder stores urine arriving from the kidneys. Its muscular wall contracts during urination, working with the urethra and sphincters to release urine.',
    ['Detrusor muscle in the wall', 'Stretchable inner lining', 'Ureter openings', 'Bladder outlet'],
    'Bladder cancer is assigned here. Other urinary diseases are not automatically assigned to the bladder and may remain in Other & unallocated.',
    'The bladder lining changes shape as the bladder fills and empties.'),
  prostate: entry(
    'The prostate makes fluid that contributes to semen. It sits below the bladder and surrounds part of the urethra.',
    ['Glandular tissue', 'Fibromuscular tissue', 'Prostatic urethra'],
    'Prostate cancer and benign prostatic hyperplasia map here. A sex filter changes the population statistics, not the reference body shown on screen.',
    'Because the urethra passes through the prostate, enlargement can affect urine flow.'),
  testes: entry(
    'The testes produce sperm and release hormones, including testosterone. Supporting cells help developing sperm mature within tightly coiled tubules.',
    ['Seminiferous tubules', 'Sertoli cells supporting sperm development', 'Leydig cells producing testosterone'],
    'Testicular cancer is assigned here. Infertility is grouped separately in Other & unallocated rather than assumed to come from the testes.',
    'The epididymis beside each testis is where sperm continue to mature after leaving the testis.'),
  breast: entry(
    'Breast tissue contains glands that can produce milk and ducts that carry it toward the nipple. Fat and connective tissue support these structures.',
    ['Milk-producing lobules', 'Milk ducts', 'Nipple and areola', 'Fat and connective tissue'],
    'Breast cancer maps here. The statistics are available by sex even though this group has no mesh in the male reference model.',
    'People of all sexes have breast tissue.'),
  uterus_cervix: entry(
    'The uterus can support the development of a pregnancy. The cervix forms its lower opening and connects it to the vagina.',
    ['Endometrium: uterine lining', 'Myometrium: uterine muscle', 'Cervix and cervical canal'],
    'Cervix uteri and corpus uteri cancers map here. Maternal conditions remain in their own systemic group, and other gynecological diseases are unallocated.',
    'The uterine lining changes during the menstrual cycle.'),
  ovaries: entry(
    'The ovaries contain developing eggs and release hormones such as estrogen and progesterone. These hormones help regulate reproductive cycles and affect other body tissues.',
    ['Ovarian follicles', 'Egg cells within follicles', 'Corpus luteum after ovulation', 'Supporting ovarian tissue'],
    'Ovary cancer is assigned here. Infertility and broader gynecological conditions are not all attributed to the ovaries.',
    'After ovulation, the emptied follicle can become a temporary hormone-producing structure called the corpus luteum.'),
  skin: entry(
    'The skin forms a protective barrier between the body and its surroundings. It supports sensation, helps regulate temperature and limits water loss.',
    ['Epidermis: outer barrier', 'Dermis: connective tissue and vessels', 'Sweat glands', 'Sensory nerve endings'],
    'Melanoma and other skin cancers, and the skin diseases family, map here. Injury-related skin damage stays in Injuries when the underlying cause is an external event.',
    'Sweat cools the body mainly as it evaporates from the skin.'),
  bones_joints: entry(
    'Bones support and protect the body, while joints connect bones and allow movement. Bone tissue also stores minerals and surrounds marrow involved in blood cell production.',
    ['Compact and spongy bone', 'Articular cartilage', 'Joint capsules and ligaments', 'Bone marrow cavities'],
    'The entire musculoskeletal diseases family is assigned here as a broad primary category. Its burden can involve muscles and connective tissues as well as bones and joints.',
    'Bone is living tissue that is continually broken down and rebuilt.'),
  muscles: entry(
    'Skeletal muscles create movement by pulling on bones and help maintain posture. Connective tissues link and support structures and transmit the forces muscles produce.',
    ['Skeletal muscle fibers', 'Tendons attaching muscles to bones', 'Fascia surrounding tissues', 'Connective tissue within muscles'],
    'No primary cause is assigned directly to this group in the current mapping. Musculoskeletal diseases are counted under Bones & joints, so an empty sum here does not mean muscle conditions cause no burden.',
    'Tendons transmit the force of muscle contraction to the structures they attach to.'),
  blood_immune: entry(
    'Blood carries oxygen, nutrients, waste and immune cells around the body. Marrow and immune tissues make and coordinate cells involved in transport and defense.',
    ['Red and white blood cells', 'Platelets and plasma', 'Bone marrow', 'Lymph nodes and spleen'],
    'Iron-deficiency anaemia, lymphomas, myeloma, leukaemia and inherited haemoglobin disorders map here. These involve circulating cells and widely distributed tissues, so no single organ represents the group.',
    'Many blood cells develop from stem cells in bone marrow.'),
  diabetes_endocrine: entry(
    'Hormones carry signals between tissues, including signals that regulate blood glucose. Diabetes and other metabolic conditions can affect blood vessels, nerves and several organs.',
    ['Hormone-producing cells', 'Pancreatic islets and insulin signaling', 'Target tissues such as liver and muscle'],
    'Diabetes mellitus and the inseparable “other endocrine, blood and immune disorders” residual map here. The grouping is systemic because those causes cannot be assigned cleanly to a single organ.',
    'A hormone can be released in one part of the body and act on cells somewhere else.'),
  mental_substance: entry(
    'Mental health conditions can affect thought, emotion and behavior. Substance use conditions can also affect the brain, other organs and daily functioning.',
    ['Brain networks supporting emotion and thought', 'Nerve-cell signaling', 'Body systems affected by substance use'],
    'The mental and substance use disorders family maps here. It remains systemic rather than being treated as a measurement of a single brain structure; injuries and other underlying causes are counted separately.',
    'The nervous system communicates through both electrical signals and chemical messengers.'),
  infections_systemic: entry(
    'Infections can involve circulating pathogens, immune responses and several tissues at once. Their effects depend on the organism and how it interacts with the body.',
    ['Blood and lymphatic circulation', 'Immune cells and lymphoid tissues', 'Affected organs and tissues'],
    'HIV/AIDS, sexually transmitted infections excluding HIV, childhood-cluster diseases, parasitic and vector diseases, leprosy and other infectious diseases map here. Site-specific infections assigned elsewhere are excluded; these causes have no single shared body location.',
    'Immune cells travel through both blood and lymphatic vessels.'),
  maternal_neonatal: entry(
    'Pregnancy and birth involve coordinated changes across the pregnant person’s body. Newborn conditions can involve the transition to breathing, feeding and life outside the uterus.',
    ['Uterus and placenta during pregnancy', 'Maternal circulation', 'Newborn lungs and circulation', 'Other newborn organ systems'],
    'Maternal and neonatal conditions map here. The group spans different people, life stages and organ systems, so it is not placed on a single organ.',
    'Before birth, the placenta exchanges gases and nutrients between maternal and fetal blood without those circulations normally mixing directly.'),
  congenital: entry(
    'Congenital anomalies are structural or functional differences that develop before birth. They can involve an isolated structure or several body systems.',
    ['Developing heart and circulation', 'Developing brain and spinal cord', 'Developing limbs and other organs'],
    'The congenital anomalies family maps here. These causes stay together rather than being reassigned to whichever organ is affected, avoiding a misleading single anatomical location.',
    'A congenital condition develops before birth, even when it is recognized later.'),
  injuries: entry(
    'Injuries result from external events and can affect many tissues. The body’s response may involve damaged structures, blood loss and inflammation.',
    ['Skin and soft tissues', 'Bones and joints', 'Brain and internal organs', 'Blood vessels'],
    'The injuries family includes transport injuries, other unintentional injuries and intentional injuries. Attribution follows the external cause, not a particular injured organ, so this group is systemic.',
    'The same external event can injure several body structures, but the underlying cause is counted once.'),
  other_unallocated: entry(
    'The body works through interacting organs and tissues, and some cause categories do not fit a single modeled organ. This group keeps those causes visible rather than forcing a precise anatomical assignment.',
    ['Oral and dental structures', 'Circulatory and digestive systems', 'Urinary and reproductive systems', 'Nutritional processes across tissues'],
    'This group includes nutritional deficiencies, oral conditions, several cancer sites and residual circulatory, digestive, urinary and reproductive categories, plus sudden infant death syndrome. It has no single anatomical location; “unallocated” means an attribution limit, not missing or harmless disease.',
    'Leaving a cause unallocated can be more honest than assigning it to an organ without enough detail.'),
}

export const oneLineFunction = (id: string) => organContent[id]?.summary.split(/(?<=\.) /)[0] ?? ''
